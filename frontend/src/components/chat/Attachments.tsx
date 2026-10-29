import { Download, FileCode2, FileText, ImageOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import type { AttachmentKind } from '../../api/types';
import { fileExtension, formatBytes } from '../../config/attachments';
import { loadAttachmentUrl, useAttachmentUrl } from '../../hooks/useAttachmentUrl';
import type { DisplayAttachment, PendingAttachment } from '../../hooks/useAttachments';
import { fadeIn, popIn, skeletonShimmer } from '../../styles/animations';
import { saveObjectUrl } from '../../utils/download';
import { Spinner } from '../common/Button';

/* ------------------------------------------------------------------ */
/*  Shared chip                                                        */
/* ------------------------------------------------------------------ */

const Chip = styled.div<{ $interactive?: boolean; $onBubble?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  max-width: 240px;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space.xs} ${theme.space.sm} ${theme.space.xs} ${theme.space.xs}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgElevated};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  animation: ${popIn} 260ms ease both;
  transition: border-color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast};

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;
      &:hover {
        border-color: ${theme.colors.primary};
        background: ${theme.colors.surfaceHover};
      }
      &:hover .action { opacity: 1; }
    `}

  .tile {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .meta { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
  .name {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sub {
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSubtle};
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .action {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    opacity: 0.6;
    transition: opacity ${({ theme }) => theme.transitions.fast};
  }
`;

const RemoveButton = styled.button`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSubtle};
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.dangerSoft};
    color: ${({ theme }) => theme.colors.danger};
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const KindIcon = ({ kind, size = 16 }: { kind: AttachmentKind; size?: number }) =>
  kind === 'code' ? <FileCode2 size={size} /> : <FileText size={size} />;

const typeLabel = (name: string, kind: AttachmentKind) => fileExtension(name) || kind;

/* ------------------------------------------------------------------ */
/*  Composer tray (pending files)                                      */
/* ------------------------------------------------------------------ */

const Tray = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.xs} 0 ${theme.space.sm}`};
  animation: ${fadeIn} 160ms ease both;
`;

interface TrayProps {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function AttachmentTray({ items, onRemove, disabled }: TrayProps) {
  if (items.length === 0) return null;
  return (
    <Tray aria-label="Attached files">
      {items.map((item) => (
        <Chip key={item.id} title={item.file.name}>
          <span className="tile">
            {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <KindIcon kind={item.kind} />}
          </span>
          <span className="meta">
            <span className="name">{item.file.name}</span>
            <span className="sub">
              {typeLabel(item.file.name, item.kind)} · {formatBytes(item.file.size)}
            </span>
          </span>
          <RemoveButton type="button" disabled={disabled} onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`}>
            <X size={13} />
          </RemoveButton>
        </Chip>
      ))}
    </Tray>
  );
}

/* ------------------------------------------------------------------ */
/*  Attachments inside a message                                       */
/* ------------------------------------------------------------------ */

const Group = styled.div<{ $alignEnd: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  justify-content: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  margin-bottom: ${({ theme }) => theme.space.sm};
`;

const Thumb = styled.button<{ $loading: boolean }>`
  position: relative;
  width: 148px;
  height: 112px;
  padding: 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  color: ${({ theme }) => theme.colors.textSubtle};
  display: grid;
  place-items: center;
  animation: ${popIn} 260ms ease both;
  transition: transform ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.fast};
  ${({ $loading }) => $loading && skeletonShimmer}

  img { width: 100%; height: 100%; object-fit: cover; display: block; }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const Lightbox = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.toast + 10};
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space.xxl};
  background: ${({ theme }) => theme.colors.overlay};
  animation: ${fadeIn} 160ms ease both;
  cursor: zoom-out;

  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: ${({ theme }) => theme.space.sm}; max-height: 100%; }
  img {
    max-width: min(92vw, 1200px);
    max-height: calc(100vh - 120px);
    border-radius: ${({ theme }) => theme.radii.lg};
    box-shadow: ${({ theme }) => theme.shadows.lg};
    animation: ${popIn} 240ms ease both;
  }
  figcaption {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }
`;

const LightboxAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgElevated};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;

function ImageAttachment({ attachment }: { attachment: DisplayAttachment }) {
  const pending = attachment.id.startsWith('temp-');
  const { url, failed } = useAttachmentUrl(pending ? null : attachment.id, attachment.localUrl);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  return (
    <>
      <Thumb
        type="button"
        $loading={!url && !failed}
        disabled={!url}
        onClick={() => setZoomed(true)}
        title={attachment.fileName}
        aria-label={`Open image ${attachment.fileName}`}
      >
        {url ? <img src={url} alt={attachment.fileName} loading="lazy" /> : failed ? <ImageOff size={20} /> : null}
      </Thumb>
      {zoomed &&
        url &&
        // Portal: message rows keep a transform from their entrance animation, which would trap `position: fixed`.
        createPortal(
        <Lightbox role="dialog" aria-modal="true" aria-label={attachment.fileName} onClick={() => setZoomed(false)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={url} alt={attachment.fileName} />
            <figcaption>
              <span>{attachment.fileName}</span>
              <LightboxAction type="button" onClick={() => saveObjectUrl(url, attachment.fileName)}>
                <Download size={13} /> Download
              </LightboxAction>
              <LightboxAction type="button" onClick={() => setZoomed(false)} aria-label="Close">
                <X size={13} />
              </LightboxAction>
            </figcaption>
          </figure>
        </Lightbox>,
          document.body,
        )}
    </>
  );
}

function FileAttachment({ attachment }: { attachment: DisplayAttachment }) {
  const pending = attachment.id.startsWith('temp-');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (pending || busy) return;
    setBusy(true);
    try {
      saveObjectUrl(await loadAttachmentUrl(attachment.id), attachment.fileName);
    } catch {
      /* the chip stays usable; a retry re-fetches */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Chip
      as="button"
      type="button"
      $interactive={!pending}
      onClick={() => void download()}
      title={pending ? attachment.fileName : `Download ${attachment.fileName}`}
    >
      <span className="tile">
        <KindIcon kind={attachment.kind} />
      </span>
      <span className="meta">
        <span className="name">{attachment.fileName}</span>
        <span className="sub">
          {typeLabel(attachment.fileName, attachment.kind)} · {formatBytes(attachment.sizeBytes)}
        </span>
      </span>
      {!pending && <span className="action">{busy ? <Spinner $size={13} /> : <Download size={14} />}</span>}
    </Chip>
  );
}

export function MessageAttachments({ attachments, alignEnd }: { attachments: DisplayAttachment[]; alignEnd: boolean }) {
  if (attachments.length === 0) return null;
  const images = attachments.filter((a) => a.kind === 'image');
  const files = attachments.filter((a) => a.kind !== 'image');
  return (
    <>
      {images.length > 0 && (
        <Group $alignEnd={alignEnd}>
          {images.map((a) => (
            <ImageAttachment key={a.id} attachment={a} />
          ))}
        </Group>
      )}
      {files.length > 0 && (
        <Group $alignEnd={alignEnd}>
          {files.map((a) => (
            <FileAttachment key={a.id} attachment={a} />
          ))}
        </Group>
      )}
    </>
  );
}
