/**
 * Mock Drive API responses for testing
 */

export const MOCK_DRIVE_RESPONSES = {
  uploadSuccess: {
    id: 'mock-file-id-123',
    name: 'Test Document.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/d/mock-file-id-123/view',
    webContentLink: 'https://drive.google.com/uc?id=mock-file-id-123',
    parents: ['mock-folder-id'],
    createdTime: '2026-01-03T12:00:00.000Z',
    modifiedTime: '2026-01-03T12:00:00.000Z',
  },

  listFiles: {
    kind: 'drive#fileList',
    incompleteSearch: false,
    files: [
      {
        id: 'file-1',
        name: 'Document1.pdf',
        mimeType: 'application/pdf',
      },
      {
        id: 'file-2',
        name: 'Document2.pdf',
        mimeType: 'application/pdf',
      },
    ],
  },

  folderInfo: {
    id: 'mock-folder-id',
    name: 'RedNote Captures',
    mimeType: 'application/vnd.google-apps.folder',
    webViewLink: 'https://drive.google.com/drive/folders/mock-folder-id',
  },

  error401: {
    error: {
      code: 401,
      message: 'Invalid Credentials',
      status: 'UNAUTHENTICATED',
    },
  },

  error403: {
    error: {
      code: 403,
      message: 'The user does not have sufficient permissions.',
      status: 'PERMISSION_DENIED',
    },
  },

  error404: {
    error: {
      code: 404,
      message: 'File not found.',
      status: 'NOT_FOUND',
    },
  },

  error429: {
    error: {
      code: 429,
      message: 'User Rate Limit Exceeded.',
      status: 'RESOURCE_EXHAUSTED',
    },
  },

  error500: {
    error: {
      code: 500,
      message: 'Internal Server Error',
      status: 'INTERNAL',
    },
  },
};

/**
 * Create a mock fetch function for Drive API testing
 */
export function createMockDriveFetch(responses: Record<string, unknown> = {}) {
  return (url: string, options?: RequestInit) => {
    const urlString = url.toString();

    // Upload endpoint
    if (urlString.includes('/upload/drive/v3/files')) {
      if (responses.upload) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(responses.upload),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.uploadSuccess),
      });
    }

    // List files endpoint
    if (urlString.includes('/drive/v3/files') && options?.method !== 'POST') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.listFiles),
      });
    }

    // Default: return upload success
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.uploadSuccess),
    });
  };
}

/**
 * Mock auth token for testing
 */
export const MOCK_AUTH_TOKEN = 'mock-oauth-access-token-for-testing';

/**
 * Mock auth state for testing
 */
export const MOCK_AUTH_STATE = {
  accessToken: MOCK_AUTH_TOKEN,
  expiresAt: Date.now() + 3600000, // 1 hour from now
  userEmail: 'test@example.com',
  isAuthenticated: true,
};
