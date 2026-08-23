import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Saved shipping details, so a returning customer doesn't retype their address.
 *
 * Deliberately holds no payment data. An earlier version persisted the card
 * number, expiry and CVV to localStorage — storing a CVV at all is a PCI-DSS
 * violation, and none of it was ever used. Card and UPI details are now entered
 * inside Razorpay's window and never reach this application.
 */
export interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  stateRegion: string;
  pinCode: string;
}

interface UserState {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

const defaultProfile: UserProfile = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  city: "",
  stateRegion: "",
  pinCode: "",
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      updateProfile: (data) => set((state) => ({ profile: { ...state.profile, ...data } })),
      clearProfile: () => set({ profile: defaultProfile }),
    }),
    {
      name: "everything-user-storage",
      version: 2,
      /** Strips card fields left behind by the previous version. */
      migrate: (persisted: any, version) => {
        if (version >= 2) return persisted;
        const p = persisted?.profile ?? {};
        return {
          profile: {
            email: p.email ?? "",
            firstName: p.firstName ?? "",
            lastName: p.lastName ?? "",
            phone: p.phone ?? "",
            address: p.address ?? "",
            city: p.city ?? "",
            stateRegion: p.stateRegion ?? "",
            pinCode: p.pinCode ?? "",
          },
        };
      },
    }
  )
);
