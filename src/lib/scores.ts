import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const saveHighScore = async (score: number, level: number, lines: number) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. Sync user profile
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp()
    }, { merge: true });

    // 2. Add to leaderboard
    await addDoc(collection(db, 'leaderboard'), {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userPhoto: user.photoURL || '',
      score,
      level,
      lines,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'leaderboard');
  }
};

export const getLeaderboard = async (count = 10) => {
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    handleFirestoreError(error, 'list', 'leaderboard');
  }
};
