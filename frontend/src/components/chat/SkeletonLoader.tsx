import styled from 'styled-components';
import { fadeIn, skeletonShimmer } from '../../styles/animations';

const Bar = styled.div<{ $w: string; $h?: number }>`
  width: ${({ $w }) => $w};
  height: ${({ $h = 12 }) => $h}px;
  border-radius: ${({ theme }) => theme.radii.sm};
  ${skeletonShimmer}
`;

const Circle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  ${skeletonShimmer}
`;

const MsgRow = styled.div<{ $right?: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  flex-direction: ${({ $right }) => ($right ? 'row-reverse' : 'row')};
  animation: ${fadeIn} 300ms ease both;
`;

const Stack = styled.div<{ $right?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  flex: 1;
  align-items: ${({ $right }) => ($right ? 'flex-end' : 'flex-start')};
  padding-top: 4px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`;

/** Skeleton for the chat viewport while a thread's history loads. */
export function MessagesSkeleton() {
  return (
    <List aria-busy="true" aria-label="Loading messages">
      {[0, 1, 2].map((i) => (
        <List key={i} style={{ gap: 24 }}>
          <MsgRow $right>
            <Circle />
            <Stack $right>
              <Bar $w="42%" $h={36} />
            </Stack>
          </MsgRow>
          <MsgRow>
            <Circle />
            <Stack>
              <Bar $w="88%" />
              <Bar $w="76%" />
              <Bar $w="64%" />
              <Bar $w="40%" />
            </Stack>
          </MsgRow>
        </List>
      ))}
    </List>
  );
}

const SideItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
`;

/** Skeleton for the sidebar conversation list. */
export function ConversationsSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading conversations">
      {Array.from({ length: count }, (_, i) => (
        <SideItem key={i}>
          <Bar $w={`${60 + ((i * 17) % 35)}%`} $h={11} />
          <Bar $w={`${35 + ((i * 23) % 40)}%`} $h={8} />
        </SideItem>
      ))}
    </div>
  );
}
