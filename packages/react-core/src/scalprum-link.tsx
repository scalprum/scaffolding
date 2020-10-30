import React from 'react';
import { unmountAppsFromRoute } from '@scalprum/core';
import { Link, useLocation, LinkProps } from 'react-router-dom';

export const ScalprumLink: React.ComponentType<LinkProps> = ({ to, onClick, ...props }) => {
  const { pathname } = useLocation();
  return (
    <Link
      onClick={(event) => {
        const shouldUnmount = (typeof to === 'string' && pathname !== to) || (typeof to === 'object' && pathname !== to.pathname);
        if (shouldUnmount) {
          unmountAppsFromRoute(pathname);
        }
        if (onClick) {
          onClick(event);
        }
      }}
      to={to}
      {...props}
    />
  );
};
