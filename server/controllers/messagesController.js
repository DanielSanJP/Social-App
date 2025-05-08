import { getSupabaseClient } from '../supabaseClient.js';

// Fetch all conversations for the logged-in user
export const getConversations = async (req, res) => {
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
    // Step 1: Fetch conversation IDs for the logged-in user
    const { data: conversationMembers, error: memberError } = await supabaseWithAuth
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (memberError) throw new Error(memberError.message);

    if (!conversationMembers || conversationMembers.length === 0) {
      return res.status(200).json([]); // Return an empty array instead of 404
    }

    const conversationIds = conversationMembers.map((member) => member.conversation_id);

    // Get all conversations with their participants
    const { data: conversations, error: conversationError } = await supabaseWithAuth
      .from('conversations')
      .select('id')
      .in('id', conversationIds);

    if (conversationError) throw new Error(conversationError.message);

    // Create an array to hold the processed conversations
    const processedConversations = [];

    // For each conversation, get the other user's details and the last message
    for (const conversation of conversations) {
      // Get the other user in this conversation
      const { data: otherUser, error: otherUserError } = await supabaseWithAuth
        .from('conversation_members')
        .select(`
          user_id,
          users:user_id(username, profile_pic_url)
        `)
        .eq('conversation_id', conversation.id)
        .neq('user_id', userId)
        .single();

      if (otherUserError) {
        console.warn(`Error fetching other user for conversation ${conversation.id}:`, otherUserError);
        continue;
      }

      // Get the last message in this conversation
      const { data: messages, error: messagesError } = await supabaseWithAuth
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messagesError) {
        console.warn(`Error fetching messages for conversation ${conversation.id}:`, messagesError);
        continue;
      }

      // Add to processed conversations
      processedConversations.push({
        conversation_id: conversation.id,
        users: otherUser.users,
        last_message: messages.length > 0 ? messages[0].content : null,
        last_message_time: messages.length > 0 ? messages[0].created_at : null
      });
    }

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
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