import { Box, LoadingOverlay } from "@mantine/core";
import { ReactNode } from "react";

interface LoadingOverlayWrapperProps {
  /** Whether the loading overlay should be visible */
  visible: boolean;
  /** Children components to be rendered under the overlay */
  children: ReactNode;
  /** Additional props for the LoadingOverlay component */
  overlayProps?: {
    zIndex?: number;
    radius?: string;
    blur?: number;
  };
  /** Additional props for the wrapper Box component */
  boxProps?: {
    pos?: string;
    [key: string]: any;
  };
}

/**
 * A reusable wrapper component that shows a loading overlay when needed
 * Provides a consistent loading experience across the application
 */
export const LoadingOverlayWrapper = ({
  visible,
  children,
  overlayProps = { radius: "sm", blur: 2, zIndex: 1000 },
  boxProps = { pos: "relative" }
}: LoadingOverlayWrapperProps) => {
  return (
    <Box {...boxProps}>
      <LoadingOverlay visible={visible} {...overlayProps} />
      {children}
    </Box>
  );
};