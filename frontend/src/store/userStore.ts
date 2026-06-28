import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  stateRegion: string;
  pinCode: string;
  // Card details (mock)
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}

interface UserState {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
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
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvv: ""
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      updateProfile: (data) => 
        set((state) => ({ 
          profile: { ...state.profile, ...data } 
        }))
    }),
    {
      name: "everything-user-storage",
    }
  )
);
