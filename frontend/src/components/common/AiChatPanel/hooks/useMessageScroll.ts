import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiMessageType } from '@/types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Keeps the conversation pinned to the bottom until the user scrolls away, and reveals an in-place edit. */
export function useMessageScroll(messages: AiMessageType[]) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editComposerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const editingUserAt = useAiStore((state) => state.editingUserAt);
  // Stays true while the user is at the bottom; only the user scrolling up ends it.
  const isNearBottomRef = useRef(true);
  // Our own smooth scroll fires scroll events on the way; they must not read as "user scrolled up".
  const ignoreScrollUntilRef = useRef(0);
  // The browser also scrolls on its own when content is swapped (the viewport clamps); only a scroll that
  // follows a wheel, touch, key or pointer action counts as the user leaving the bottom.
  const userIntentUntilRef = useRef(0);
  const pointerDownRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const markUserIntent = useCallback(() => {
    userIntentUntilRef.current = Date.now() + 250;
  }, []);

  useEffect(() => {
    const release = (): void => {
      pointerDownRef.current = false;
    };
    window.addEventListener('pointerup', release);
    return (): void => window.removeEventListener('pointerup', release);
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || Date.now() < ignoreScrollUntilRef.current) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const userScrolling = pointerDownRef.current || Date.now() < userIntentUntilRef.current;
    // A wheel or touch scroll animates for a while; every event of it keeps the user's intent alive.
    if (userScrolling) markUserIntent();
    if (nearBottom) {
      isNearBottomRef.current = true;
      setShowScrollButton(false);
    } else if (userScrolling) {
      isNearBottomRef.current = false;
      setShowScrollButton(true);
    }
  }, [markUserIntent]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isNearBottomRef.current = true;
    if (behavior === 'smooth') ignoreScrollUntilRef.current = Date.now() + 600;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const onPointerDown = useCallback(() => {
    pointerDownRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!editingUserAt) return;
    const container = messagesContainerRef.current;
    const el = editComposerRef.current;
    if (!container || !el) return;
    container.scrollTop += el.getBoundingClientRect().top - container.getBoundingClientRect().top;
  }, [editingUserAt]);

  useEffect(() => {
    if (!editingUserAt) return;
    const onPointerDownOutside = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (editComposerRef.current?.contains(target)) return;
      if (target.closest('.MuiPopover-root, .MuiModal-root, .MuiMenu-root')) return;
      useAiStore.getState().cancelMessageEdit();
    };
    document.addEventListener('pointerdown', onPointerDownOutside);
    return (): void => document.removeEventListener('pointerdown', onPointerDownOutside);
  }, [editingUserAt]);

  // Sending a message always brings the conversation to the bottom, wherever the user had scrolled.
  const lastMessage = messages[messages.length - 1];
  const sentJustNow = lastMessage?.role === 'user' && lastMessage.isNew;
  useEffect(() => {
    if (sentJustNow) scrollToBottom();
  }, [sentJustNow, messages.length, scrollToBottom]);

  // Whatever makes the conversation taller (tokens, cards, tables) is followed while pinned to the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) scrollToBottom();
    });
    observer.observe(list);
    return (): void => observer.disconnect();
  }, [scrollToBottom]);

  return {
    messagesContainerRef,
    editComposerRef,
    listRef,
    editingUserAt,
    showScrollButton,
    setShowScrollButton,
    scrollToBottom,
    markUserIntent,
    handleScroll,
    onPointerDown
  };
}
