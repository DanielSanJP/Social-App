import { getSupabaseClient } from '../supabaseClient.js';

// Fetch all conversations for the logged-in user
export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    console.error('getConversations: No user ID found in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get auth token from request headers or cookies
  const authToken = req.headers.authorization?.split(' ')[1] || 
                    req.cookies?.authToken;
  
  if (!authToken) {
    console.error('getConversations: No auth token found');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log(`Fetching conversations for user: ${userId}`);
  
  // Use the admin/service role client to bypass RLS policies
  const supabase = getSupabaseClient();

  try {
    // Instead of using conversation_members table directly (which has the problematic RLS policy),
    // use a raw SQL query to bypass RLS and avoid the recursive policy
    const { data: conversationsData, error: sqlError } = await supabase.rpc(
      'get_user_conversations',
      { user_id_param: userId }
    ).catch(err => {
      console.error('RPC error:', err);
      
      // Fallback method if RPC doesn't exist
      return supabase.from('conversations')
        .select(`
          id,
          created_at
        `)
        .filter('id', 'in', 
          supabase.from('conversation_members')
            .select('conversation_id')
            .eq('user_id', userId)
        );
    });

    if (sqlError) {
      console.error('Error fetching conversations with RPC/SQL:', sqlError);
      throw new Error(sqlError.message);
    }

    if (!conversationsData || conversationsData.length === 0) {
      console.log('No conversations found for user:', userId);
      return res.status(200).json([]); // Return an empty array if no conversations
    }

    console.log(`Found ${conversationsData.length} conversations for user ${userId}`);

    // Create an array to hold the processed conversations
    const processedConversations = [];

    // For each conversation, get the other user's details and the last message
    for (const conversation of conversationsData) {
      try {
        const conversationId = conversation.id;
        
        // Get all members in this conversation using direct parameter queries to avoid RLS recursion
        const { data: members, error: membersError } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId);

        if (membersError) {
          console.warn(`Error fetching members for conversation ${conversationId}:`, membersError);
          continue;
        }

        // Find the other user's ID (not the current user)
        const otherUserId = members.find(member => member.user_id !== userId)?.user_id;
        
        if (!otherUserId) {
          console.warn(`No other user found in conversation ${conversationId}`);
          continue;
        }
        
        // Fetch user details in a separate query
        const { data: otherUser, error: otherUserError } = await supabase
          .from('users')
          .select('username, profile_pic_url')
          .eq('id', otherUserId)
          .single();

        if (otherUserError) {
          console.warn(`Error fetching other user for conversation ${conversationId}:`, otherUserError);
          continue;
        }

        // Get the last message in this conversation
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.warn(`Error fetching messages for conversation ${conversationId}:`, messagesError);
          continue;
        }

        // Add to processed conversations
        processedConversations.push({
          conversation_id: conversationId,
          users: otherUser,
          last_message: messages.length > 0 ? messages[0].content : null,
          last_message_time: messages.length > 0 ? messages[0].created_at : null,
          is_sender: messages.length > 0 ? messages[0].sender_id === userId : false
        });
      } catch (err) {
        console.error(`Error processing conversation ${conversation.id}:`, err);
        // Continue with other conversations instead of breaking the entire flow
      }
    }

    console.log(`Successfully processed ${processedConversations.length} conversations`);
    res.status(200).json(processedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Fetch messages for a specific conversation
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get auth token from request headers or cookies
  const authToken = req.headers.authorization?.split(' ')[1] || 
                    req.cookies?.authToken;
  
  // Get a Supabase client with the user's auth token
  const supabaseWithAuth = getSupabaseClient(authToken);

  try {
    // Validate if the conversation exists
    const { data: conversation, error: conversationError } = await supabaseWithAuth
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Fetch messages for the conversation
    const { data: messages, error: messageError } = await supabaseWithAuth
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messageError) throw new Error(messageError.message);

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const senderId = req.user?.id;
  
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get auth token from request headers or cookies
  const authToken = req.headers.authorization?.split(' ')[1] || 
                    req.cookies?.authToken;
  
  // Get a Supabase client with the user's auth token
  const supabaseWithAuth = getSupabaseClient(authToken);

  try {
    // Fetch the members of the conversation
    const { data: conversationMembers, error: membersError } = await supabaseWithAuth
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (membersError) {
      console.error("Error fetching conversation members:", membersError);
      return res.status(400).json({ error: "Failed to fetch conversation members." });
    }

    // Determine the receiver_id (the member who is not the sender)
    const receiverId = conversationMembers
      .map((member) => member.user_id)
      .find((id) => id !== senderId);

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver not found in the conversation." });
    }

    // Insert the message into the database
    const { data: message, error: messageError } = await supabaseWithAuth
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          created_at: new Date(),
        },
      ])
      .select();

    if (messageError) {
      console.error("Error inserting message:", messageError);
      return res.status(400).json({ error: "Failed to send message." });
    }

    res.status(201).json(message[0]);
  } catch (err) {
    console.error("Unexpected error sending message:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Create or fetch a conversation
export const createOrFetchConversation = async (req, res) => {
  const { recipientId } = req.body;
  const senderId = req.user?.id;

  if (!senderId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Get auth token from request headers or cookies
  const authToken = req.headers.authorization?.split(' ')[1] || 
                   req.cookies?.authToken;
  
  // Get a Supabase client with the user's auth token
  const supabaseWithAuth = getSupabaseClient(authToken);

  try {
    const { data: senderConversations, error: senderError } = await supabaseWithAuth
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', senderId);

    if (senderError) {
      throw new Error(senderError.message);
    }

    const { data: recipientConversations, error: recipientError } = await supabaseWithAuth
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', recipientId);

    if (recipientError) {
      throw new Error(recipientError.message);
    }

    const existingConversation = senderConversations.find((sc) =>
      recipientConversations.some((rc) => rc.conversation_id === sc.conversation_id)
    );

    if (existingConversation) {
      return res.status(200).json({ conversationId: existingConversation.conversation_id });
    }

    // Create a new conversation
    const { data: newConversation, error: createError } = await supabaseWithAuth
      .from('conversations')
      .insert({ created_by: senderId })
      .select();

    if (createError) {
      throw new Error(createError.message);
    }

    const conversationId = newConversation[0].id;

    const { error: memberError } = await supabaseWithAuth.from('conversation_members').insert([
      { conversation_id: conversationId, user_id: senderId },
      { conversation_id: conversationId, user_id: recipientId },
    ]);

    if (memberError) {
      throw new Error(memberError.message);
    }

    res.status(201).json({ conversationId });
  } catch (error) {
    console.error('Error creating or fetching conversation:', error);
    res.status(500).json({ error: error.message });
  }
};