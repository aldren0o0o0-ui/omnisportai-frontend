export const getDisplayName = (user) => {
  if (!user) return '';
  if (user.first_name && user.first_name.trim()) return user.first_name.trim();
  if (user.name && user.name.trim()) return user.name.trim().split(' ')[0];
  if (user.full_name && user.full_name.trim()) return user.full_name.trim().split(' ')[0];
  if (user.username && user.username.trim()) return user.username.trim();
  return '';
};

export const getEmptyIntramuralPresentation = ({ isCoordinator, hasAvailableIntramurals }) => {
  if (isCoordinator) {
    return {
      mode: 'coordinator',
      showCreateButton: true,
      showHistoryButton: Boolean(hasAvailableIntramurals),
      description: hasAvailableIntramurals
        ? 'No intramural is currently selected. Select an intramural tournament from the top bar to manage tournament operations, or create a new intramural to begin a fresh competition season.'
        : 'No intramural tournament has been set up yet. Create a new intramural to configure sports, schedules, participating departments, and team brackets.',
    };
  }
  if (hasAvailableIntramurals) {
    return {
      mode: 'select_topbar',
      showCreateButton: false,
      showHistoryButton: false,
      description: 'Please select an intramural from the app top bar to view schedules, live results, brackets, and team standings.',
    };
  }
  return {
    mode: 'no_intramural',
    showCreateButton: false,
    showHistoryButton: false,
    description: 'There is currently no intramural tournament active or scheduled. Please check back later once a tournament has been created by the sports coordinator.',
  };
};
