import React from 'react';
import clsx from 'clsx';

const Card = ({ children, className, ...props }) => {
  return (
    <div 
      className={clsx(
        'bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-slide-up',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
