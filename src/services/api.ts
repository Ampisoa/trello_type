/**
 * Node.js + PostgreSQL Backend Client Service
 * Connects React TypeScript Frontend to the Node.js Express + PostgreSQL Backend.
 */

import { Card, StepDefinition, UserProfile, CardComment, CardAttachment, InvitedVisitor, MerchPole, CustomBoard } from '../types';

const API_BASE_URL = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL) || '/api/v1';
const TOKEN_KEY = 'suivi_flux_jwt_token';

let activeToken: string | null = null;
try {
  activeToken = localStorage.getItem(TOKEN_KEY);
} catch {
  // Storage fallback
}

// Helper for standard JSON HTTP requests with error handling and Authorization header
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = ApiService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || errorData.detail || `Erreur API: ${response.status} ${response.statusText}`);
      // Attach the HTTP status so callers can branch on real server responses
      // (e.g. 401 = bad credentials) vs network-level failures.
      (error as any).status = response.status;
      throw error;
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    // Only log if it is an actual server-side response error, not transient initial connection warm-up
    if (error?.message && error.message !== 'Failed to fetch') {
      console.warn(`[Node.js + PostgreSQL Service] Appel sur ${endpoint}:`, error.message);
    }
    throw error;
  }
}

export const ApiService = {
  // Check backend connection & health
  async checkHealth(): Promise<{ status: string; engine: string; timestamp: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return await res.json();
  },

  // Token management
  getToken(): string | null {
    if (!activeToken) {
      try {
        activeToken = localStorage.getItem(TOKEN_KEY);
      } catch {
        // storage disabled
      }
    }
    return activeToken;
  },

  setToken(token: string | null) {
    activeToken = token;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // storage disabled
    }
  },

  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------
  async login(email: string, password?: string): Promise<{ status: string; user: UserProfile; token: string }> {
    const res = await request<{ status: string; user: UserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.token) {
      ApiService.setToken(res.token);
    }
    return res;
  },

  async register(userData: Partial<UserProfile>): Promise<{ status: string; user: UserProfile; token: string }> {
    const res = await request<{ status: string; user: UserProfile; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res?.token) {
      ApiService.setToken(res.token);
    }
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
    return await request<{ status: string; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const res = await request<{ status: string; user: UserProfile }>('/auth/me');
      return res?.user || null;
    } catch {
      return null;
    }
  },

  async acquireTokenForUser(credentials: { userId?: string; email?: string; password?: string }): Promise<string | null> {
    try {
      const res = await request<{ status: string; token: string; user: UserProfile }>('/auth/token', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (res?.token) {
        ApiService.setToken(res.token);
        return res.token;
      }
      return null;
    } catch (e: any) {
      console.warn('[ApiService] Impossible d\'acquérir le jeton:', e?.message);
      return null;
    }
  },

  logout() {
    ApiService.setToken(null);
  },

  // ----------------------------------------------------
  // CARDS & MODELS
  // ----------------------------------------------------
  async getCards(params?: { userId?: string; role?: string; search?: string; stepId?: string }): Promise<Card[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.append('user_id', params.userId);
    if (params?.role) query.append('role', params.role);
    if (params?.search) query.append('search', params.search);
    if (params?.stepId) query.append('step_id', params.stepId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await request<Card[]>(`/cards${queryString}`);
  },

  async getCardById(cardId: string): Promise<Card> {
    return await request<Card>(`/cards/${cardId}`);
  },

  async createCard(cardData: Partial<Card>): Promise<Card> {
    return await request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  },

  async updateCard(cardId: string, cardData: Partial<Card>, authorName?: string, authorRole?: string): Promise<Card> {
    const query = new URLSearchParams();
    if (authorName) query.append('author_name', authorName);
    if (authorRole) query.append('author_role', authorRole);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await request<Card>(`/cards/${cardId}${queryString}`, {
      method: 'PUT',
      body: JSON.stringify(cardData),
    });
  },

  async deleteCard(cardId: string): Promise<void> {
    await request<void>(`/cards/${cardId}`, {
      method: 'DELETE',
    });
  },

  async reorderCardsInStep(stepId: string, orderedCardIds: string[]): Promise<Card[]> {
    return await request<Card[]>(`/cards/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ stepId, orderedCardIds }),
    });
  },

  // ----------------------------------------------------
  // STEPS
  // ----------------------------------------------------
  async getSteps(): Promise<StepDefinition[]> {
    return await request<StepDefinition[]>('/steps');
  },

  async updateStep(stepId: string, stepData: Partial<StepDefinition>): Promise<StepDefinition> {
    return await request<StepDefinition>(`/steps/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(stepData),
    });
  },

  // ----------------------------------------------------
  // USERS & PROFILES
  // ----------------------------------------------------
  async getUsers(): Promise<UserProfile[]> {
    return await request<UserProfile[]>('/users');
  },

  async createUser(userData: Partial<UserProfile>): Promise<UserProfile> {
    return await request<UserProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(userId: string, userData: Partial<UserProfile>): Promise<UserProfile> {
    return await request<UserProfile>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(userId: string): Promise<{ status: string; deletedId: string }> {
    return await request<{ status: string; deletedId: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // VISITOR OBSERVERS (Resp Point Clients Privilege)
  // ----------------------------------------------------
  async inviteVisitor(
    cardId: string,
    email: string,
    name?: string,
    notes?: string,
    inviterName = 'Responsable Point Clients',
    inviterRole = 'resp_point_clients'
  ): Promise<InvitedVisitor> {
    const query = new URLSearchParams({
      inviter_name: inviterName,
      inviter_role: inviterRole,
    });

    return await request<InvitedVisitor>(`/visitors/invite?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({
        card_id: cardId,
        email,
        name,
        notes,
        invited_by: `${inviterName} (${inviterRole})`,
      }),
    });
  },

  async revokeVisitor(
    cardId: string,
    email: string,
    revokerName = 'Responsable Point Clients',
    revokerRole = 'resp_point_clients'
  ): Promise<{ status: string; message: string }> {
    const query = new URLSearchParams({
      revoker_name: revokerName,
      revoker_role: revokerRole,
    });

    return await request<{ status: string; message: string }>(
      `/visitors/${cardId}/${encodeURIComponent(email)}?${query.toString()}`,
      {
        method: 'DELETE',
      }
    );
  },

  async verifyVisitorToken(token: string): Promise<{ valid: boolean; user?: UserProfile; cardId?: string; boardId?: string; poleId?: string; detail?: string }> {
    return await request<{ valid: boolean; user?: UserProfile; cardId?: string; boardId?: string; poleId?: string; detail?: string }>(
      `/visitors/verify?token=${encodeURIComponent(token)}`
    );
  },

  async getVisitorToken(params: { email: string; name?: string; cardId?: string; boardId?: string; poleId?: string }): Promise<string | null> {
    try {
      const query = new URLSearchParams({
        email: params.email,
        ...(params.name ? { name: params.name } : {}),
        ...(params.cardId ? { card_id: params.cardId } : {}),
        ...(params.boardId ? { board_id: params.boardId } : {}),
        ...(params.poleId ? { pole_id: params.poleId } : {}),
      });
      const res = await request<{ token: string }>(`/visitors/token?${query.toString()}`);
      return res?.token || null;
    } catch {
      return null;
    }
  },

  // ----------------------------------------------------
  // TEMP RESPONSABLE POINT CLIENT
  // ----------------------------------------------------
  async designateTempResponsable(
    targetUserId: string,
    designatedBy: string,
    durationHours: number
  ): Promise<UserProfile> {
    return await request<UserProfile>(`/users/${targetUserId}/temp-responsable`, {
      method: 'POST',
      body: JSON.stringify({ designatedBy, durationHours }),
    });
  },

  async removeTempResponsable(targetUserId: string): Promise<UserProfile> {
    return await request<UserProfile>(`/users/${targetUserId}/temp-responsable`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // POLES & BOARDS
  // ----------------------------------------------------
  async getPoles(): Promise<MerchPole[]> {
    return await request<MerchPole[]>('/poles');
  },

  async createPole(poleData: Partial<MerchPole>): Promise<MerchPole> {
    return await request<MerchPole>('/poles', {
      method: 'POST',
      body: JSON.stringify(poleData),
    });
  },

  async updatePole(id: string, poleData: Partial<MerchPole>): Promise<MerchPole> {
    return await request<MerchPole>(`/poles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(poleData),
    });
  },

  async deletePole(id: string): Promise<{ status: string; deletedId: string }> {
    return await request<{ status: string; deletedId: string }>(`/poles/${id}`, {
      method: 'DELETE',
    });
  },

  async getBoards(): Promise<CustomBoard[]> {
    return await request<CustomBoard[]>('/boards');
  },

  async createBoard(boardData: Partial<CustomBoard>): Promise<CustomBoard> {
    return await request<CustomBoard>('/boards', {
      method: 'POST',
      body: JSON.stringify(boardData),
    });
  },

  async updateBoard(id: string, boardData: Partial<CustomBoard>): Promise<CustomBoard> {
    return await request<CustomBoard>(`/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(boardData),
    });
  },

  async deleteBoard(id: string): Promise<{ status: string; deletedId: string }> {
    return await request<{ status: string; deletedId: string }>(`/boards/${id}`, {
      method: 'DELETE',
    });
  },

  // ----------------------------------------------------
  // COMMENTS & ATTACHMENTS
  // ----------------------------------------------------
  async addComment(cardId: string, commentData: Partial<CardComment>): Promise<CardComment> {
    return await request<CardComment>(`/comments/${cardId}`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  },

  async addAttachment(cardId: string, attData: Partial<CardAttachment>): Promise<CardAttachment> {
    return await request<CardAttachment>(`/attachments/${cardId}`, {
      method: 'POST',
      body: JSON.stringify(attData),
    });
  },
};
