import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDB } from "../../lib/db";
import { countUniqueView } from "../../lib/views";
import { backgroundFromKey } from "../../lib/r2";
import ProfileBackdrop from "../../components/ProfileBackdrop";
import "./profile.css";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  username: string;
  displayUsername: string | null;
  image: string | null;
};

// Same rules the signup form enforces. Anything else can't be a profile.
const VALID = /^[a-z0-9._-]{3,24}$/;

async function findUser(raw: string): Promise<Row | null> {
  const name = decodeURIComponent(raw).toLowerCase();
  if (!VALID.test(name)) return null;
  return getDB()
    .prepare(
      'SELECT id, username, "displayUsername", image FROM "user" WHERE username = ?',
    )
    .bind(name)
    .first<Row>();
}

/** Public UID, or null if migration 0004 hasn't been applied yet.
 *  Self-healing: an account that somehow has no UID yet (signed up between the
 *  migration and the deploy, say) gets one now, in signup order. */
async function getUid(userId: string): Promise<number | null> {
  try {
    const db = getDB();
    const read = () =>
      db.prepare("SELECT uid FROM user_uids WHERE user_id = ?").bind(userId).first<{ uid: number }>();

    let row = await read();
    if (!row) {
      await db
        .prepare(
          'INSERT OR IGNORE INTO user_uids (user_id) SELECT "id" FROM "user" WHERE "id" NOT IN (SELECT user_id FROM user_uids) ORDER BY "createdAt" ASC, rowid ASC',
        )
        .run();
      row = await read();
    }
    return row?.uid ?? null;
  } catch {
    return null;
  }
}

/** Background upload for this profile, or null (also null if the column is missing). */
async function getBackground(userId: string) {
  try {
    const row = await getDB()
      .prepare("SELECT background_key FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ background_key: string | null }>();
    return backgroundFromKey(row?.background_key);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await findUser(username);
  if (!user) return { title: "Not found | raided.cc" };
  return { title: `${user.displayUsername || user.username} | raided.cc` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await findUser(username);
  if (!user) notFound();

  const views = await countUniqueView(user.id);
  const uid = await getUid(user.id);
  const background = await getBackground(user.id);
  const name = user.displayUsername || user.username;

  return (
    <div className="profile">
      {background && <ProfileBackdrop src={background.url} kind={background.kind} />}
      <div className="profile__stack">
        <main className="profile__card">
          {/* Default pfp for now; uploads come later */}
          <div className="profile__avatar">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" draggable={false} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="profile__avatar-default" src="/icons/user.png" alt="" draggable={false} />
            )}
          </div>

          <h1 className="profile__name">
            <span className="profile__name-hover tip-host" tabIndex={uid !== null ? 0 : undefined}>
              {name}
              {uid !== null && (
                <span className="tip" role="tooltip">
                  <span className="tip__label">UID</span>
                  <span className="tip__value">{uid}</span>
                </span>
              )}
            </span>
          </h1>

          {views !== null && (
            <span className="profile__views tip-host" tabIndex={0}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 5C6.5 5 2.4 8.6 1 12c1.4 3.4 5.5 7 11 7s9.6-3.6 11-7c-1.4-3.4-5.5-7-11-7zm0 11.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm0-6.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"
                />
              </svg>
              {views.toLocaleString("en-US")}
              <span className="tip" role="tooltip">
                <span className="tip__value">{views.toLocaleString("en-US")}</span>
                <span className="tip__label">{views === 1 ? "view" : "views"}</span>
              </span>
            </span>
          )}
        </main>
      </div>
    </div>
  );
}