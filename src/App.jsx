import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext"; // Import only UserProvider from context
import { useUser } from "./hooks/useUser"; // Import useUser from hooks
import { NavigationProvider } from "./contexts/NavigationContext"; // Import only NavigationProvider
import { useNavigation } from "./hooks/useNavigation"; // Import useNavigation from hooks
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Profile, { ProtectedRoute } from "./components/Profile";
import SocialFeed from "./components/SocialFeed";
import CreatePost from "./components/CreatePost";
import Search from "./components/Search";
import Messages from "./components/Messages"; // Import Messages component
import Chat from "./components/Chat"; // Import Chat component
import UserPosts from "./components/UserPosts"; // Import UserPosts component
import PostView from "./components/PostView"; // Import PostView component
import "./styles/App.css";

const AppContent = () => {
  const { user } = useUser();
  const { isNavVisible } = useNavigation();

  return (
    <Router>
      {isNavVisible && <Navbar />}
      <Routes>
        <Route path="/" element={<SocialFeed />} />
        <Route path="/socialfeed" element={<SocialFeed />} />
        <Route path="/search" element={<Search />} />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/createpost"
          element={
            <ProtectedRoute>
              <CreatePost userId={user?.id} />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages
                onSelectConversation={
                  (conversation) =>
                    (window.location.href = `/chat/${conversation.conversation_id}`) // Use `conversation.conversation_id`
                }
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        {/* Add route for UserPosts */}
        <Route
          path="/user/:userId/posts"
          element={
            <ProtectedRoute>
              <UserPosts />
            </ProtectedRoute>
          }
        />
        {/* Add route for PostView */}
        <Route
          path="/post/:postId"
          element={
            <ProtectedRoute>
              <PostView />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <UserProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </UserProvider>
  );
}

export default App;
