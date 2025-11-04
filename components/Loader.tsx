import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col justify-center items-center z-50">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-white text-lg mt-4 font-semibold">Building knowledge galaxy...</p>
    </div>
  );
};

export default Loader;
