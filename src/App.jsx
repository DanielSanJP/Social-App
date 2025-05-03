import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { UserProvider, useUser } from "./contexts/UserContext"; // Import UserProvider and useUser
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Profile from "./components/Profile";
import SocialFeed from "./components/SocialFeed";
import "./styles/App.css";
import CreatePost from "./components/CreatePost";
import Search from "./components/Search";

const AppContent = () => {
  const { user } = useUser();

  // Log the user context to the console
  console.log("UserContext:", user);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<SocialFeed />} />
        <Route path="/socialfeed" element={<SocialFeed />} />
        <Route path="/search" element={<Search />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/createpost" element={<CreatePost />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
