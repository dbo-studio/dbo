import type { ComponentType, JSX } from 'react';
import { ServerToolBodyStyled, ServerToolStyled } from '../ServerTool.styled';
import type { ServerToolProps } from '../serverToolShared';

/** A server page from the tree (Status, Operations, ...) in the shared page frame. */
export const serverPage = (Panel: ComponentType<ServerToolProps>): ComponentType<ServerToolProps> =>
  function ServerPage(props: ServerToolProps): JSX.Element {
    return (
      <ServerToolStyled data-testid='server-tool'>
        <ServerToolBodyStyled>
          <Panel {...props} />
        </ServerToolBodyStyled>
      </ServerToolStyled>
    );
  };
