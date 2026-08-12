import React from 'react';
import { useAccess } from '../hooks/useAccess';
import type { FeatureKey, UserRole } from '../config/permissions.config';

interface HasAccessProps {
  feature?: FeatureKey;
  roles?: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const HasAccess: React.FC<HasAccessProps> = ({
  feature,
  roles,
  children,
  fallback = null,
}) => {
  const { hasFeature, hasRole } = useAccess();

  let isAllowed = true;

  if (feature) {
    isAllowed = hasFeature(feature);
  } else if (roles) {
    isAllowed = hasRole(roles);
  }

  return isAllowed ? <>{children}</> : <>{fallback}</>;
};