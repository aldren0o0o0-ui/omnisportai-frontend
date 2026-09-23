import UserProfileView from "../../components/user/UserProfileView";

const MyProfile = () => {
  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
      <UserProfileView mode="self" />
    </div>
  );
};

export default MyProfile;
