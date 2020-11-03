import React from 'react';
import { unmountAppsFromRoute } from '@scalprum/core';
import { Link, useLocation, LinkProps } from 'react-router-dom';
import { History, Location, LocationDescriptor } from 'history';

export interface ScalprumLinkProps extends LinkProps {
  shouldUnmount?: boolean | ((pathname: string, to: string | History.LocationDescriptor | ((location: Location) => LocationDescriptor)) => boolean);
  unmount?: (pathname: string) => void;
}
export const ScalprumLink: React.ComponentType<ScalprumLinkProps> = ({ to, onClick, shouldUnmount, unmount, ...props }) => {
  const { pathname } = useLocation();
  return (
    <Link
      onClick={(event) => {
        let unmountResult: boolean | undefined;
        const unmountFunction = unmount || (() => unmountAppsFromRoute(pathname));
        if (typeof shouldUnmount === 'undefined') {
          unmountResult = (typeof to === 'string' && pathname !== to) || (typeof to === 'object' && pathname !== to.pathname);
        } else if (typeof shouldUnmount === 'boolean') {
          unmountResult = shouldUnmount;
        } else if (typeof shouldUnmount === 'function') {
          unmountResult = shouldUnmount(pathname, to);
        }
        if (unmountResult) {
          unmountFunction(pathname);
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
