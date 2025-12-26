import {
  NavLink,
  Divider,
} from "@mantine/core";
import {
  IconLayoutDashboard,
  IconGitFork,
  IconPaperclip,
  IconStar,
  IconLayoutGrid,
  IconNote,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDatabase } from "../../hooks/useDatabase";
import log from "../../utils/logger";

interface NavigationPanelProps {
  activeItem?: string;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  activeItem
}) => {
  const navigate = useNavigate();
  const { dbId } = useDatabase();
  const { dbId: urlDbId } = useParams<{ dbId: string }>();

  const handleAllPagesClick = () => {
    if (!dbId) {
      log.error("No database ID available");
      return;
    }
    navigate(`/db/${dbId}/all-pages`);
  };

  return (
    <>
      <Divider />
      <NavLink
        label="All Pages"
        leftSection={<IconLayoutDashboard />}
        onClick={handleAllPagesClick}
      />
      <NavLink
        label="Graph View"
        leftSection={<IconGitFork />}
        onClick={() => log.debug("[NavigationPanel] Graph View clicked")}
      />
      <NavLink
        label="Assets"
        leftSection={<IconPaperclip />}
        onClick={() => log.debug("[NavigationPanel] Assets clicked")}
      />
      <Divider />
      {/*<NavLink
        label="Favorites"
        leftSection={<IconStar />}
        childrenOffset={28}
      >
        <NavLink
          label="Favorite Page 1"
          onClick={() => log.debug("[NavigationPanel] Favorite Page 1 clicked")}
        />
        <NavLink
          label="Favorite Page 2"
          onClick={() => log.debug("[NavigationPanel] Favorite Page 2 clicked")}
        />
        <NavLink
          label="Favorite Page 3"
          onClick={() => log.debug("[NavigationPanel] Favorite Page 3 clicked")}
        />
      </NavLink>*/}
      {/*<NavLink
        label="Views"
        leftSection={<IconLayoutGrid />}
        childrenOffset={28}
      >
        <NavLink
          label="View Page 1"
          onClick={() => log.debug("[NavigationPanel] View Page 1 clicked")}
        />
        <NavLink
          label="View Page 2"
          onClick={() => log.debug("[NavigationPanel] View Page 2 clicked")}
        />
        <NavLink
          label="View Page 3"
          onClick={() => log.debug("[NavigationPanel] View Page 3 clicked")}
        />
      </NavLink>*/}
      <NavLink
        label="Notes"
        leftSection={<IconNote />}
        childrenOffset={28}
      >
        <NavLink
          label="Note Page 1"
          onClick={() => log.debug("[NavigationPanel] Note Page 1 clicked")}
        />
        <NavLink
          label="Note Page 2"
          onClick={() => log.debug("[NavigationPanel] Note Page 2 clicked")}
        />
        <NavLink
          label="Note Page 3"
          onClick={() => log.debug("[NavigationPanel] Note Page 3 clicked")}
        />
      </NavLink>
    </>
  );
};

export default NavigationPanel;