import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { apiBaseUrl } from "./authConfig";

export const ApiCall: React.FC = () => {
  const { acquireToken, isAuthenticated } = useAuth();
  const [result, setResult] = useState<string | null>(null);

  const callApi = async () => {
    try {
      const token = await acquireToken();
      const res = await fetch(`${apiBaseUrl}/api/hello`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setResult(JSON.stringify(json));
    } catch (e: any) {
      setResult(e?.message || String(e));
    }
  };

  return (
    <div>
      <button onClick={callApi} disabled={!isAuthenticated} className="px-3 py-1 border rounded">
        Call API
      </button>
      {result && (
        <pre className="mt-2 p-2 border bg-gray-50 max-w-xl overflow-auto">{result}</pre>
      )}
    </div>
  );
};

export default ApiCall;
