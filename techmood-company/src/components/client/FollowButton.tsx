"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { VentureStatus } from "@/data/ventures";
import { useT } from "@/i18n/client";
import { STORAGE_KEYS, useStored } from "@/lib/storage";
import { enableNotifications, useNotifyPermission } from "@/lib/notify-client";

/**
 * «تابع المشروع» — remembered on this device. A followed venture whose
 * status changes later produces a device notification (if notifications are on).
 */
export function FollowButton({ slug, status, name, compact = false }: { slug: string; status: VentureStatus; name: string; compact?: boolean }) {
  const t = useT();
  const [following, setFollowing] = useStored<Record<string, string>>(STORAGE_KEYS.following, {});
  const permission = useNotifyPermission();
  const [message, setMessage] = useState("");
  const isFollowing = Boolean(following[slug]);

  async function toggle() {
    const next = { ...following };
    if (isFollowing) {
      delete next[slug];
      setFollowing(next);
      flash(t("أُلغيت المتابعة", "Unfollowed"));
      return;
    }
    next[slug] = status;
    setFollowing(next);
    if (permission === "default") {
      const result = await enableNotifications();
      flash(
        result === "granted"
          ? t("تتابع المشروع، وستصلك إشعارات بتغيّر حالته", "Following — you'll be notified when its status changes")
          : t("تتابع المشروع على هذا الجهاز", "Following on this device"),
      );
    } else {
      flash(t("تتابع المشروع على هذا الجهاز", "Following on this device"));
    }
  }

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3200);
  }

  return (
    <>
      <button
        type="button"
        className={`btn ${isFollowing ? "btn-soft" : "btn-ghost"} ${compact ? "btn-sm" : ""}`}
        aria-pressed={isFollowing}
        onClick={toggle}
        aria-label={isFollowing ? t(`إلغاء متابعة ${name}`, `Unfollow ${name}`) : t(`متابعة ${name}`, `Follow ${name}`)}
      >
        <Icon name={isFollowing ? "check" : "heart"} size={17} />
        {isFollowing ? t("تتابعه", "Following") : t("تابع", "Follow")}
      </button>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}
