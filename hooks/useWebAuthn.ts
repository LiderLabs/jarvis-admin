import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface WebAuthnCredential {
  id: string;
  staffName: string;
  credentialId: string;
  publicKey: string;
  createdAt: Date;
}

// Store credentials in localStorage for demo (in production, this goes to backend)
const CREDENTIALS_KEY = 'washlab_webauthn_credentials';

const getStoredCredentials = (): WebAuthnCredential[] => {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeCredential = (credential: WebAuthnCredential) => {
  const credentials = getStoredCredentials();
  credentials.push(credential);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
};

export const useWebAuthn = () => {
  const [isSupported, setIsSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.PublicKeyCredential && 
      navigator.credentials && 
      typeof navigator.credentials.create === 'function');
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [enrolledStaff, setEnrolledStaff] = useState<WebAuthnCredential[]>(() => {
    if (typeof window === 'undefined') return [];
    return getStoredCredentials();
  });

  // Generate a random challenge
  const generateChallenge = useCallback(() => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
  }, []);

  // Convert ArrayBuffer to base64
  const bufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }, []);

  // Convert base64 to ArrayBuffer
  const base64ToBuffer = useCallback((base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }, []);

  // Enroll new staff with WebAuthn (Face ID / fingerprint)
  const enrollStaff = useCallback(async (staffName: string, staffId: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!isSupported) {
      toast.error('WebAuthn not supported on this device');
      return false;
    }

    setIsProcessing(true);
    
    try {
      const challenge = generateChallenge();
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'WashLab',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(staffId),
          name: staffName,
          displayName: staffName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device biometrics
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      
      const newCredential: WebAuthnCredential = {
        id: staffId,
        staffName,
        credentialId: bufferToBase64(credential.rawId),
        publicKey: bufferToBase64(response.getPublicKey() || new ArrayBuffer(0)),
        createdAt: new Date(),
      };

      storeCredential(newCredential);
      setEnrolledStaff(getStoredCredentials());
      
      toast.success(`${staffName} enrolled successfully!`);
      return true;
    } catch (error: any) {
      console.error('Enrollment error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else if (error.name === 'SecurityError') {
        toast.error('Security error - please try again');
      } else {
        toast.error('Failed to enroll. Please try again.');
      }
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [isSupported, generateChallenge, bufferToBase64]);

  // Verify staff identity with WebAuthn
  const verifyStaff = useCallback(async (staffId?: string): Promise<{ success: boolean; staffName?: string; staffId?: string }> => {
    if (typeof window === 'undefined') return { success: false };
    if (!isSupported) {
      toast.error('WebAuthn not supported on this device');
      return { success: false };
    }

    const credentials = getStoredCredentials();
    if (credentials.length === 0) {
      toast.error('No staff enrolled. Please enroll first.');
      return { success: false };
    }

    setIsProcessing(true);

    try {
      const challenge = generateChallenge();
      
      // Filter credentials if specific staff requested
      const allowCredentials = staffId 
        ? credentials.filter(c => c.id === staffId)
        : credentials;

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: allowCredentials.map(cred => ({
          type: 'public-key' as const,
          id: base64ToBuffer(cred.credentialId),
          transports: ['internal'] as AuthenticatorTransport[],
        })),
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Authentication failed');
      }

      // Find the matching staff member
      const credentialId = bufferToBase64(assertion.rawId);
      const matchedStaff = credentials.find(c => c.credentialId === credentialId);

      if (matchedStaff) {
        toast.success(`Welcome, ${matchedStaff.staffName}!`);
        return { 
          success: true, 
          staffName: matchedStaff.staffName,
          staffId: matchedStaff.id 
        };
      }

      return { success: false };
    } catch (error: any) {
      console.error('Verification error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  }, [isSupported, generateChallenge, bufferToBase64, base64ToBuffer]);

  // Check if staff is enrolled
  const isStaffEnrolled = useCallback((staffId: string): boolean => {
    return enrolledStaff.some(c => c.id === staffId);
  }, [enrolledStaff]);

  // Get all enrolled staff
  const getEnrolledStaff = useCallback((): WebAuthnCredential[] => {
    return enrolledStaff;
  }, [enrolledStaff]);

  // Remove staff enrollment
  const removeEnrollment = useCallback((staffId: string): boolean => {
    if (typeof window === 'undefined') return false;
    const credentials = getStoredCredentials().filter(c => c.id !== staffId);
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    setEnrolledStaff(credentials);
    toast.success('Enrollment removed');
    return true;
  }, []);

  return {
    isSupported,
    isProcessing,
    enrollStaff,
    verifyStaff,
    isStaffEnrolled,
    getEnrolledStaff,
    removeEnrollment,
    enrolledStaff,
  };
};

