import { apiRequest } from "@/utils/api";

export const getCreators = async () => {
  try {
    const data = await apiRequest("api/users/discover-creators/", {
      method: "GET",
    });
    console.log("Creators data:", data);
    return data;
  } catch (err) {
    console.error("Error fetching creators:", err);
    return []; // fallback to empty array
  }
};

export const starCreator = async (creatorId: number) => {
  try {
    const data = await apiRequest(`api/users/star/${creatorId}/toggle/`, {
      method: "POST",
    });
    console.log(`Starred creator ${creatorId}:`, data);
    return data;
  } catch (err) {
    console.error(`Error starring creator ${creatorId}:`, err);
  }
};

/* =========================
   DISCOVERY
========================= */
export const discoverConnect = async () => {
  try {
    return await apiRequest("api/users/discover-connect/", {
      method: "GET",
    });
  } catch (err) {
    console.error("Discover connect error:", err);
    return [];
  }
};

/* =========================
   CONNECT SYSTEM
========================= */
export const connectUser = async (id: number) => {
  try {
    return await apiRequest(`api/users/connect/${id}/`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Connect error:", err);
    throw err;
  }
};

export const removeConnection = async (id: number) => {
  try {
    return await apiRequest(`api/users/remove/${id}/`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Remove connection error:", err);
    throw err;
  }
};

export const cancelConnection = async (id: number) => {
  try {
    return await apiRequest(`api/users/cancel/${id}/`, {
      method: "POST",
    });
  } catch (err) {
    console.error("Cancel connection error:", err);
    throw err;
  }
};

/* =========================
   CONNECTED USERS
========================= */
export const getConnectedUsers = async () => {
  try {
    return await apiRequest("api/users/connected/", {
      method: "GET",
    });
  } catch (err) {
    console.error("Connected users error:", err);
    return [];
  }
};