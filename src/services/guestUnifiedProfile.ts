import {emptyUnifiedUserProfile,type UnifiedUserProfile} from '../../shared/unified-user-profile';

// Guest state intentionally lives only in this module's process memory. It is
// never serialized and a full page reload creates a fresh empty profile.
let guestProfile:UnifiedUserProfile=emptyUnifiedUserProfile('guest');

export function getGuestUnifiedProfile():UnifiedUserProfile{return structuredClone(guestProfile)}
export function updateGuestUnifiedProfile(update:(current:UnifiedUserProfile)=>UnifiedUserProfile){guestProfile=update(getGuestUnifiedProfile());return getGuestUnifiedProfile()}
export function resetGuestUnifiedProfile(){guestProfile=emptyUnifiedUserProfile('guest');return getGuestUnifiedProfile()}
export const guestUnifiedFeatures={peopleMatching:false,governmentAiCourse:false} as const;
