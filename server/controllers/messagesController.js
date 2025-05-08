import { supabase } from '../supabaseClient.js';

// Fetch all conversations for the logged-in user
export const getConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    // Step 1: Fetch conversation IDs for the logged-in user
    const { data: conversationMembers, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (memberError) throw new Error(memberError.message);

    if (!conversationMembers || conversationMembers.length === 0) {
      return res.status(200).json([]); // Return an empty array instead of 404
    }

    const conversationIds = conversationMembers.map((member) => member.conversation_id);

    // Step 2: Fetch conversations and their members (excluding the logged-in user)
    const { data: conversations, error: conversationError } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        users:users(username, profile_pic_url)
      `)
      .in('conversation_id', conversationIds)
      .neq('user_id', userId); // Exclude the logged-in user

    if (conversationError) throw new Error(conversationError.message);

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch messages for a specific conversation
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    // Validate if the conversation exists
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Fetch messages for the conversation
    const { data: messages, error: messageError } = await supabase
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
  const senderId = req.user.id; // Assuming `authenticateUser` middleware attaches the user ID

  try {
    // Fetch the members of the conversation
    const { data: conversationMembers, error: membersError } = await supabase
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
    const { data: message, error: messageError } = await supabase
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
  const senderId = req.user.id;

  if (!senderId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: senderConversations, error: senderError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', senderId);

    if (senderError) {
      throw new Error(senderError.message);
    }

    const { data: recipientConversations, error: recipientError } = await supabase
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
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({ created_by: senderId })
      .select();

    if (createError) {
      throw new Error(createError.message);
    }

    const conversationId = newConversation[0].id;

    const { error: memberError } = await supabase.from('conversation_members').insert([
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