const RouteDataBoundary = ({ children }) => {
  return (
    <div className="min-h-[calc(100vh-8rem)] min-w-0">
      {children}
    </div>
  );
};

export default RouteDataBoundary;
