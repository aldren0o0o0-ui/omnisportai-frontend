import React from 'react';

const DashboardCard = ({ children, className = '', noPadding = false, ...rest }) => {
  return (
    <div className={`os-card min-w-0 ${noPadding ? '' : 'p-4 sm:p-5 lg:p-6'} ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default DashboardCard;
