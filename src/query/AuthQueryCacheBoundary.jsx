import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { queryClient } from "./queryClient";

const AuthQueryCacheBoundary = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const identity = isAuthenticated ? String(user?.id || user?.user_id || user?.email || "authenticated") : "anonymous";
  const previousIdentityRef = useRef(identity);

  useEffect(() => {
    if (previousIdentityRef.current !== identity) {
      queryClient.clear();
      previousIdentityRef.current = identity;
    }
  }, [identity]);

  return children;
};

export default AuthQueryCacheBoundary;
