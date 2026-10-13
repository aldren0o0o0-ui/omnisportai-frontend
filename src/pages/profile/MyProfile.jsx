import UserProfileView from "../../components/user/UserProfileView";
import ProfileView from "../../components/profile/ProfileView";

const MyProfile = () => {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <ProfileView mode="self" />
      <div className="hidden" aria-hidden="true">
        <UserProfileView mode="self" />
      </div>
    </div>
  );
};

export default MyProfile;
