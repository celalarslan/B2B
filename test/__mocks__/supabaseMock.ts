// Mock Supabase client
export const supabaseMock = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation(callback => {
      callback({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    }),
  }),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'test-url' } }),
    }),
  },
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
};

// Mock the supabase module
jest.mock('../src/lib/supabase', () => ({
  supabase: supabaseMock,
  getCurrentUser: jest.fn().mockResolvedValue(null),
  logConversation: jest.fn().mockResolvedValue(undefined),
}));

export default supabaseMock;