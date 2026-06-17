import CONFIG from "../config";
import Session from "./session";

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
  SUBSCRIBE_NOTIFICATION: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

async function parseJsonResponse(response) {
  const responseJson = await response.json();

  if (!response.ok || responseJson.error) {
    throw new Error(
      responseJson.message || "Request gagal. Silakan coba lagi.",
    );
  }

  return responseJson;
}

function getAuthHeaders() {
  const token = Session.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const StoryApi = {
  async register({ name, email, password }) {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    return parseJsonResponse(response);
  },

  async login({ email, password }) {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    return parseJsonResponse(response);
  },

  async getStories({ page = 1, size = 20, location = 1 } = {}) {
    const url = new URL(ENDPOINTS.STORIES);
    url.searchParams.set("page", page);
    url.searchParams.set("size", size);
    url.searchParams.set("location", location);

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
  },

  async getStoryDetail(id) {
    const response = await fetch(ENDPOINTS.STORY_DETAIL(id), {
      headers: getAuthHeaders(),
    });

    return parseJsonResponse(response);
  },

  async addStory({ description, photo, lat, lon }) {
    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);

    if (lat !== null && lon !== null) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }

    const response = await fetch(ENDPOINTS.STORIES, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    return parseJsonResponse(response);
  },

  async subscribeNotification(subscription) {
    const subscriptionJson =
      typeof subscription.toJSON === "function"
        ? subscription.toJSON()
        : subscription;

    const response = await fetch(ENDPOINTS.SUBSCRIBE_NOTIFICATION, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: {
          auth: subscriptionJson.keys.auth,
          p256dh: subscriptionJson.keys.p256dh,
        },
      }),
    });

    return parseJsonResponse(response);
  },

  async unsubscribeNotification({ endpoint }) {
    const response = await fetch(ENDPOINTS.SUBSCRIBE_NOTIFICATION, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });

    return parseJsonResponse(response);
  },
};

export default StoryApi;
