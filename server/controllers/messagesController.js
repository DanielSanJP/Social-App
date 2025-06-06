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
  
  // Always start with the service role client to bypass RLS completely and avoid recursion
  const serviceClient = getSupabaseClient(null, true);

  try {
    // Get conversation IDs directly with service role to bypass all RLS
    const { data: userConversations, error: directError } = await serviceClient
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);
      
    console.log("Service role conversation query result:", userConversations);

    if (directError) {
      console.error('Error fetching user conversation IDs:', directError);
      throw new Error(directError.message);
    }

    if (!userConversations || userConversations.length === 0) {
      console.log('No conversations found for user:', userId);
      return res.status(200).json([]); // Return empty array if no conversations
    }
    
    // Extract conversation IDs
    const conversationIds = userConversations.map(item => item.conversation_id);
    console.log(`Found ${conversationIds.length} conversations for user ${userId}: ${JSON.stringify(conversationIds)}`);

    // Get basic conversation data
    const { data: conversations, error: convsError } = await serviceClient
      .from('conversations')
      .select('id, created_at')
      .in('id', conversationIds);
      
    console.log("Conversation details query result:", conversations);

    if (convsError) {
      console.error('Error fetching conversations:', convsError);
      throw new Error(convsError.message);
    }

    if (!conversations || conversations.length === 0) {
      console.log('No conversation details found');
      return res.status(200).json([]);
    }
    
    console.log(`Retrieved ${conversations.length} conversation details: ${JSON.stringify(conversations)}`);

    // Process each conversation to get the other members and messages
    const processedConversations = [];
    const errors = [];

    for (const conversation of conversations) {
      try {
        const conversationId = conversation.id;
        console.log(`Processing conversation: ${conversationId}`);
        
        // Get all members in this conversation
        const { data: members, error: membersError } = await serviceClient
          .from('conversation_members')
          .select('user_id, conversation_id')  // Include conversation_id for easier debugging
          .eq('conversation_id', conversationId);

        console.log(`Raw members query for ${conversationId}:`, members);

        if (membersError) {
          console.warn(`Error fetching members for conversation ${conversationId}:`, membersError);
          errors.push(`Members error for ${conversationId}: ${membersError.message}`);
          continue;
        }

        console.log(`Found ${members.length} members for conversation ${conversationId}: ${JSON.stringify(members)}`);

        // Find the other user's ID (not the current user)
        const otherUserMember = members.find(member => member.user_id !== userId);
        const otherUserId = otherUserMember?.user_id;
        
        if (!otherUserId) {
          console.warn(`No other user found in conversation ${conversationId}, members: ${JSON.stringify(members)}`);
          errors.push(`No other user found in conversation ${conversationId}`);
          continue;
        }
        
        console.log(`Found other user ID: ${otherUserId} in conversation ${conversationId}`);
        
        // Fetch user details in a separate query
        const { data: otherUser, error: otherUserError } = await serviceClient
          .from('users')
          .select('id, username, profile_pic_url') // Ensure you select these fields explicitly
          .eq('id', otherUserId)
          .single();

        if (otherUserError) {
          console.warn(`Error fetching other user for conversation ${conversationId}:`, otherUserError);
          errors.push(`User error for ${conversationId}: ${otherUserError.message}`);
          continue;
        }

        console.log(`Retrieved other user details: ${JSON.stringify(otherUser)}`);

        // Get the last message in this conversation
        const { data: messages, error: messagesError } = await serviceClient
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.warn(`Error fetching messages for conversation ${conversationId}:`, messagesError);
          errors.push(`Messages error for ${conversationId}: ${messagesError.message}`);
          continue;
        }

        console.log(`Found ${messages.length} messages for conversation ${conversationId}`);

        // Add to processed conversations
        const processedConversation = {
          conversation_id: conversationId,
          users: otherUser,
          last_message: messages.length > 0 ? messages[0].content : null,
          last_message_time: messages.length > 0 ? messages[0].created_at : conversation.created_at,
          is_sender: messages.length > 0 ? messages[0].sender_id === userId : false
        };
        
        console.log(`Processed conversation: ${JSON.stringify(processedConversation)}`);
        processedConversations.push(processedConversation);
      } catch (err) {
        console.error(`Error processing conversation ${conversation.id}:`, err);
        errors.push(`Unexpected error for ${conversation.id}: ${err.message}`);
        // Continue with other conversations instead of breaking the entire flow
      }
    }

    console.log(`Successfully processed ${processedConversations.length} conversations`);
    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} errors while processing: ${JSON.stringify(errors)}`);
    }
    
    // Add diagnostics
    const diagnostics = async () => {
      console.log("================ DIAGNOSTICS ================");
      
      // Check conversation_members for this user
      const { data: memberCheck } = await serviceClient
        .from('conversation_members')
        .select('*')
        .eq('user_id', userId);
      console.log("Conversation members for user:", memberCheck);
      
      // Check conversations table
      const { data: convCheck } = await serviceClient
        .from('conversations')
        .select('*');
      console.log("All conversations:", convCheck);
      
      // Check messages table
      const { data: msgCheck } = await serviceClient
        .from('messages')
        .select('*');
      console.log("All messages:", msgCheck);
    };

    await diagnostics();

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
  
  // Add at the beginning of the sendMessage function
  console.log("Message request:", {
    conversationId,
    content,
    senderId,
    authToken: !!authToken // just log if it exists, not the actual token
  });

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
  
  // Get a service role client that bypasses RLS for all operations
  const serviceClient = getSupabaseClient(null, true);

  try {
    console.log(`Creating or fetching conversation between ${senderId} and ${recipientId}`);
    
    // Check for existing conversations (use service client to bypass RLS)
    const { data: senderConversations, error: senderError } = await serviceClient
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', senderId);

    if (senderError) {
      console.error('Error fetching sender conversations:', senderError);
      throw new Error(senderError.message);
    }

    const { data: recipientConversations, error: recipientError } = await serviceClient
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', recipientId);

    if (recipientError) {
      console.error('Error fetching recipient conversations:', recipientError);
      throw new Error(recipientError.message);
    }

    // Find conversations that both users are part of
    const existingConversation = senderConversations.find((sc) =>
      recipientConversations.some((rc) => rc.conversation_id === sc.conversation_id)
    );

    if (existingConversation) {
      console.log(`Found existing conversation: ${existingConversation.conversation_id}`);
      return res.status(200).json({ conversationId: existingConversation.conversation_id });
    }

    console.log('No existing conversation found, creating new one');
    
    // Create a new conversation using service role client to bypass RLS
    const { data: newConversation, error: createError } = await serviceClient
      .from('conversations')
      .insert({ created_by: senderId })
      .select();

    if (createError) {
      console.error('Error creating conversation:', createError);
      throw new Error(createError.message);
    }

    const conversationId = newConversation[0].id;
    console.log(`Created new conversation with ID: ${conversationId}`);

    // Add members using service role client to ensure it works
    const { error: memberError } = await serviceClient
      .from('conversation_members')
      .insert([
        { conversation_id: conversationId, user_id: senderId },
        { conversation_id: conversationId, user_id: recipientId },
      ]);

    if (memberError) {
      console.error('Error adding conversation members:', memberError);
      throw new Error(memberError.message);
    }

    console.log('Successfully added members to conversation');
    res.status(201).json({ conversationId });
  } catch (error) {
    console.error('Error creating or fetching conversation:', error);
    res.status(500).json({ error: error.message });
  }
};