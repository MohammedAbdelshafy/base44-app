import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_ANTIGRAVITY_API_URL || 'http://localhost:8400';

/**
 * Fetch helper with error handling.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// =============================================================================
// Dashboard
// =============================================================================

export function useDashboardSummary(options = {}) {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch('/api/dashboard/summary'),
    refetchInterval: 5000, // Refresh every 5s
    ...options,
  });
}

export function useDashboardCosts() {
  return useQuery({
    queryKey: ['dashboard', 'costs'],
    queryFn: () => apiFetch('/api/dashboard/costs'),
    refetchInterval: 30000,
  });
}

export function useGitStatus() {
  return useQuery({
    queryKey: ['dashboard', 'git'],
    queryFn: () => apiFetch('/api/dashboard/git'),
    refetchInterval: 15000,
  });
}

// =============================================================================
// Missions
// =============================================================================

export function useMissions(params = {}) {
  const { status, page = 1, pageSize = 20, orderBy = 'created_at' } = params;
  const searchParams = new URLSearchParams();
  if (status) searchParams.set('status', status);
  searchParams.set('page', page);
  searchParams.set('page_size', pageSize);
  searchParams.set('order_by', orderBy);

  return useQuery({
    queryKey: ['missions', { status, page, pageSize, orderBy }],
    queryFn: () => apiFetch(`/api/missions?${searchParams}`),
    refetchInterval: 5000,
  });
}

export function useMission(missionId) {
  return useQuery({
    queryKey: ['mission', missionId],
    queryFn: () => apiFetch(`/api/missions/${missionId}`),
    enabled: !!missionId,
    refetchInterval: 3000,
  });
}

export function useMissionState(missionId, logOffset = 0) {
  return useQuery({
    queryKey: ['mission', missionId, 'state', logOffset],
    queryFn: () => apiFetch(`/api/missions/${missionId}/state?log_offset=${logOffset}`),
    enabled: !!missionId,
    refetchInterval: 3000,
  });
}

export function useMissionLogs(missionId, params = {}) {
  const { limit = 100, afterId } = params;
  const searchParams = new URLSearchParams({ limit });
  if (afterId) searchParams.set('after_id', afterId);

  return useQuery({
    queryKey: ['mission', missionId, 'logs', { limit, afterId }],
    queryFn: () => apiFetch(`/api/missions/${missionId}/logs?${searchParams}`),
    enabled: !!missionId,
    refetchInterval: 2000,
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiFetch('/api/missions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, data }) => apiFetch(`/api/missions/${missionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, { missionId }) => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePauseMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId) => apiFetch(`/api/missions/${missionId}/pause`, { method: 'POST' }),
    onSuccess: (_, missionId) => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useResumeMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId) => apiFetch(`/api/missions/${missionId}/resume`, { method: 'POST' }),
    onSuccess: (_, missionId) => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useRetryMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId) => apiFetch(`/api/missions/${missionId}/retry`, { method: 'POST' }),
    onSuccess: (_, missionId) => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId) => apiFetch(`/api/missions/${missionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// =============================================================================
// Agents
// =============================================================================

export function useAgents(params = {}) {
  const { missionId, status } = params;
  const searchParams = new URLSearchParams();
  if (missionId) searchParams.set('mission_id', missionId);
  if (status) searchParams.set('status', status);

  return useQuery({
    queryKey: ['agents', { missionId, status }],
    queryFn: () => apiFetch(`/api/agents?${searchParams}`),
    refetchInterval: 5000,
  });
}

export function useAgent(agentId) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => apiFetch(`/api/agents/${agentId}`),
    enabled: !!agentId,
    refetchInterval: 3000,
  });
}

export function useRestartAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId) => apiFetch(`/api/agents/${agentId}/restart`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useKillAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, reason = 'manual' }) =>
      apiFetch(`/api/agents/${agentId}/kill?reason=${reason}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCheckpoints(agentId, params = {}) {
  const { limit = 20, milestonesOnly = false } = params;
  return useQuery({
    queryKey: ['checkpoints', agentId, { limit, milestonesOnly }],
    queryFn: () =>
      apiFetch(`/api/agents/${agentId}/checkpoints?limit=${limit}&milestones_only=${milestonesOnly}`),
    enabled: !!agentId,
  });
}

// =============================================================================
// Chronicle
// =============================================================================

export function useChronicleSearch(query, params = {}) {
  return useMutation({
    mutationFn: (searchData) => apiFetch('/api/chronicle/search', {
      method: 'POST',
      body: JSON.stringify(searchData),
    }),
  });
}

export function useChronicleIngest() {
  return useMutation({
    mutationFn: (data) => apiFetch('/api/chronicle/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  });
}

// =============================================================================
// System
// =============================================================================

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch('/health'),
    refetchInterval: 10000,
  });
}
