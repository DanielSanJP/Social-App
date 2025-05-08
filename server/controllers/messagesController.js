import { getSupabaseClient } from '../supabaseClient.js';

// Fetch all conversations for the logged-in user
export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  
  console.log("=====================================================");
  console.log("Starting getConversations with user:", userId);

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
  
  // Use authenticated client since we're fixing RLS policies
  const supabase = getSupabaseClient(authToken);

  try {
    // First get all conversation IDs this user is part of - direct approach
    const { data: userConversations, error: userConvError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);
      
    console.log("User conversations query result:", userConversations);

    if (userConvError) {
      console.error('Error fetching user conversation IDs:', userConvError);
      throw new Error(userConvError.message);
    }

    if (!userConversations || userConversations.length === 0) {
      console.log('No conversations found for user:', userId);
      return res.status(200).json([]); // Return empty array if no conversations
    }
    
    // Extract conversation IDs
    const conversationIds = userConversations.map(item => item.conversation_id);
    console.log(`Found ${conversationIds.length} conversations for user ${userId}: ${JSON.stringify(conversationIds)}`);

    // Get full conversation data with the most recent message for each conversation
    const { data: conversationsData, error: convsError } = await supabase
      .from('conversations')
      .select(`
        id:conversation_id, 
        created_at,
        conversation_members!inner(user_id),
        messages:messages(
          id, 
          content,
          created_at,
          sender_id,
          receiver_id,
          conversation_id
        )
      `)
      .in('id', conversationIds)
      .order('created_at', { ascending: false });

    if (convsError) {
      console.error('Error fetching conversation details:', convsError);
      return res.status(500).json({ error: convsError.message });
    }

    // Now process each conversation to get the last message and other user info
    const processedConversations = await Promise.all(conversationsData.map(async (conversation) => {
      // Find the most recent message
      const messages = conversation.messages || [];
      messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastMessage = messages.length > 0 ? messages[0] : null;
      
      // Find the other user in the conversation (not the current user)
      const otherUserMember = conversation.conversation_members.find(member => member.user_id !== userId);
      const otherUserId = otherUserMember ? otherUserMember.user_id : null;
      
      // Get other user data
      let userData = null;
      if (otherUserId) {
        const { data: otherUser } = await supabase
          .from('users')
          .select('id, username, profile_pic_url')
          .eq('id', otherUserId)
          .single();
        userData = otherUser;
      }
      
      return {
        conversation_id: conversation.id,
        created_at: conversation.created_at,
        last_message: lastMessage ? lastMessage.content : null,
        last_message_time: lastMessage ? lastMessage.created_at : conversation.created_at,
        is_sender: lastMessage ? lastMessage.sender_id === userId : false,
        users: userData
      };
    }));

    return res.status(200).json(processedConversations);
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