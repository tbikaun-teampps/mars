import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { queryClient } from "@/api/query-client";
import {
  setImpersonatedUserId as setApiImpersonatedUserId,
  getImpersonatedUserId as getApiImpersonatedUserId,
} from "@/api/client";

const STORAGE_KEY = "impersonated_user_id";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  isImpersonating: boolean;
  startImpersonating: (userId: string) => void;
  stopImpersonating: () => void;
}

const ImpersonationContext = createContext<
  ImpersonationContextType | undefined
>(undefined);

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({
  children,
}: ImpersonationProviderProps) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(
    () => {
      // Initialize from sessionStorage
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Also sync to API client
        setApiImpersonatedUserId(stored);
      }
      return stored;
    }
  );

  // Sync with API client on mount (in case of page reload)
  useEffect(() => {
    const stored = getApiImpersonatedUserId();
    if (stored !== impersonatedUserId) {
      setApiImpersonatedUserId(impersonatedUserId);
    }
  }, [impersonatedUserId]);

  const startImpersonating = useCallback((userId: string) => {
    // Update state
    setImpersonatedUserId(userId);

    // Persist to sessionStorage (clears on tab close)
    sessionStorage.setItem(STORAGE_KEY, userId);

    // Update API client
    setApiImpersonatedUserId(userId);

    // Invalidate all queries to refetch with new user context
    queryClient.invalidateQueries();
  }, []);

  const stopImpersonating = useCallback(() => {
    // Clear state
    setImpersonatedUserId(null);

    // Remove from sessionStorage
    sessionStorage.removeItem(STORAGE_KEY);

    // Clear from API client
    setApiImpersonatedUserId(null);

    // Invalidate all queries to refetch with original user context
    queryClient.invalidateQueries();
  }, []);

  const value: ImpersonationContextType = {
    impersonatedUserId,
    isImpersonating: impersonatedUserId !== null,
    startImpersonating,
    stopImpersonating,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextType {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error(
      "useImpersonation must be used within an ImpersonationProvider"
    );
  }
  return context;
}