package com.linus2002.serenity;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Keeps the app alive while a session or sound is under way with the screen off,
 * and shows it as a player card on the lock screen and in the notification shade.
 *
 * The sound itself comes from the WebView, which Capacitor leaves running in the
 * background. What ends it otherwise is Android reclaiming a background app, or
 * the CPU sleeping during a silent stretch. A foreground service protects
 * against the first and a partial wake lock against the second.
 *
 * The card is a media session: Android draws it from the title, artwork, length
 * and position it is given, and its buttons come back here and on to the web
 * layer (see {@link BackgroundSoundPlugin}), which does the actual playing.
 */
public class BackgroundSoundService extends Service {

    /** What the card shows. Times in milliseconds. Set by the plugin. */
    static final class NowPlaying {
        String title;
        String subtitle;
        String artwork;
        long durationMs;
        long positionMs;
        boolean playing;
        boolean canSeek;
    }

    /** Hands a button press on to the web layer. */
    interface ActionListener {
        void onAction(String action, double positionSeconds);
    }

    static volatile ActionListener listener;
    static volatile NowPlaying nowPlaying;
    /** Whether something is actually under way, as opposed to a paused card. */
    static volatile boolean holding;
    static volatile BackgroundSoundService instance;

    private static final String CHANNEL_ID = "background_sound";
    private static final int NOTIFICATION_ID = 7001;
    private static final long SKIP_MS = 10_000L;

    private static final String ACTION_PLAY = "com.linus2002.serenity.PLAY";
    private static final String ACTION_PAUSE = "com.linus2002.serenity.PAUSE";
    private static final String ACTION_BACK = "com.linus2002.serenity.BACK";
    private static final String ACTION_FORWARD = "com.linus2002.serenity.FORWARD";
    private static final String CUSTOM_BACK = "back10";
    private static final String CUSTOM_FORWARD = "forward10";

    /** Long enough for a night of sleep sounds; a safety net if a stop never comes. */
    private static final long WAKE_LOCK_TIMEOUT_MS = 12 * 60 * 60 * 1000L;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService loader = Executors.newSingleThreadExecutor();
    private PowerManager.WakeLock wakeLock;
    private MediaSessionCompat session;
    private Bitmap appIcon;
    private String artworkUrl;
    private Bitmap artwork;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "serenity:background-sound");
        wakeLock.setReferenceCounted(false);

        session = new MediaSessionCompat(this, "Serenity");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { send("play", -1); }
            @Override public void onPause() { send("pause", -1); }
            @Override public void onStop() { send("pause", -1); }
            @Override public void onSeekTo(long pos) { send("seekto", pos / 1000.0); }
            @Override public void onFastForward() { send("seekforward", -1); }
            @Override public void onRewind() { send("seekbackward", -1); }
            @Override public void onSkipToNext() { send("seekforward", -1); }
            @Override public void onSkipToPrevious() { send("seekbackward", -1); }
            @Override public void onCustomAction(String action, android.os.Bundle extras) {
                if (CUSTOM_BACK.equals(action)) send("seekbackward", -1);
                else if (CUSTOM_FORWARD.equals(action)) send("seekforward", -1);
            }
        });
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        session.setActive(true);
        instance = this;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PLAY.equals(action)) send("play", -1);
        else if (ACTION_PAUSE.equals(action)) send("pause", -1);
        else if (ACTION_BACK.equals(action)) send("seekbackward", -1);
        else if (ACTION_FORWARD.equals(action)) send("seekforward", -1);

        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        refresh();
        // Not sticky: without the web layer there is nothing to keep alive for.
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (wakeLock.isHeld()) wakeLock.release();
        session.setActive(false);
        session.release();
        loader.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** Brings the card and the wake lock in line with the latest state. Main thread. */
    void refresh() {
        if (holding) {
            if (!wakeLock.isHeld()) wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
        } else if (wakeLock.isHeld()) {
            wakeLock.release();
        }

        NowPlaying now = nowPlaying;
        if (now != null) {
            loadArtwork(now.artwork);
            MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, now.title)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, now.title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, now.subtitle)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, now.subtitle)
                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art());
            // Without a length, Android shows no progress bar: right for endless sounds.
            if (now.durationMs > 0) meta.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, now.durationMs);
            session.setMetadata(meta.build());

            long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_STOP;
            PlaybackStateCompat.Builder state = new PlaybackStateCompat.Builder()
                .setState(
                    now.playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                    now.positionMs,
                    now.playing ? 1f : 0f
                );
            if (now.canSeek) {
                actions |= PlaybackStateCompat.ACTION_SEEK_TO | PlaybackStateCompat.ACTION_FAST_FORWARD
                    | PlaybackStateCompat.ACTION_REWIND;
                state.addCustomAction(CUSTOM_BACK, getString(R.string.background_sound_back), android.R.drawable.ic_media_rew);
                state.addCustomAction(CUSTOM_FORWARD, getString(R.string.background_sound_forward), android.R.drawable.ic_media_ff);
            }
            state.setActions(actions);
            session.setPlaybackState(state.build());
        }

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void send(String action, double positionSeconds) {
        ActionListener target = listener;
        if (target != null) target.onAction(action, positionSeconds);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.background_sound_channel),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent tap = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_serenity)
            .setColor(ContextCompat.getColor(this, R.color.background_sound_tint))
            .setContentIntent(tap)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NowPlaying now = nowPlaying;
        if (now == null) {
            // Nothing to show yet: the plain "keeps going" note, as before.
            return builder
                .setContentTitle(getString(R.string.app_name))
                .setContentText(getString(R.string.background_sound_text))
                .setOngoing(true)
                .build();
        }

        builder
            .setContentTitle(now.title)
            .setContentText(now.subtitle)
            .setLargeIcon(art())
            .setOngoing(now.playing);
        int compact;
        if (now.canSeek) {
            builder.addAction(android.R.drawable.ic_media_rew, getString(R.string.background_sound_back), button(ACTION_BACK, 1));
            addPlayPause(builder, now.playing);
            builder.addAction(android.R.drawable.ic_media_ff, getString(R.string.background_sound_forward), button(ACTION_FORWARD, 4));
            compact = 3;
        } else {
            addPlayPause(builder, now.playing);
            compact = 1;
        }
        androidx.media.app.NotificationCompat.MediaStyle style =
            new androidx.media.app.NotificationCompat.MediaStyle().setMediaSession(session.getSessionToken());
        style.setShowActionsInCompactView(compact == 3 ? new int[] { 0, 1, 2 } : new int[] { 0 });
        builder.setStyle(style);
        return builder.build();
    }

    private void addPlayPause(NotificationCompat.Builder builder, boolean playing) {
        if (playing) {
            builder.addAction(android.R.drawable.ic_media_pause, getString(R.string.background_sound_pause), button(ACTION_PAUSE, 2));
        } else {
            builder.addAction(android.R.drawable.ic_media_play, getString(R.string.background_sound_play), button(ACTION_PLAY, 3));
        }
    }

    private PendingIntent button(String action, int requestCode) {
        Intent intent = new Intent(this, BackgroundSoundService.class).setAction(action);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The current artwork, or the app icon until it has loaded (or without any). */
    private Bitmap art() {
        if (artwork != null) return artwork;
        if (appIcon == null) appIcon = iconBitmap();
        return appIcon;
    }

    private Bitmap iconBitmap() {
        try {
            Drawable icon = getPackageManager().getApplicationIcon(getPackageName());
            if (icon instanceof BitmapDrawable) return ((BitmapDrawable) icon).getBitmap();
            int size = 256;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            icon.setBounds(0, 0, size, size);
            icon.draw(canvas);
            return bitmap;
        } catch (Exception error) {
            return null;
        }
    }

    /** Fetches the artwork off the main thread, once per address, then redraws. */
    private void loadArtwork(String url) {
        if (url == null || url.isEmpty()) {
            artworkUrl = null;
            artwork = null;
            return;
        }
        if (url.equals(artworkUrl)) return;
        artworkUrl = url;
        artwork = null;
        loader.execute(() -> {
            Bitmap bitmap = fetch(url);
            main.post(() -> {
                if (!url.equals(artworkUrl) || instance == null) return;
                artwork = bitmap;
                if (bitmap != null) refresh();
            });
        });
    }

    private Bitmap fetch(String url) {
        try {
            Uri uri = Uri.parse(url);
            InputStream stream;
            if ("localhost".equals(uri.getHost())) {
                // The app's own files, which Capacitor serves from its assets.
                stream = getAssets().open("public" + uri.getPath());
            } else {
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                stream = connection.getInputStream();
            }
            try (InputStream in = stream) {
                Bitmap full = BitmapFactory.decodeStream(in);
                if (full == null) return null;
                // A small square is all a card needs, and keeps memory down.
                int side = Math.min(full.getWidth(), full.getHeight());
                Bitmap square = Bitmap.createBitmap(full, (full.getWidth() - side) / 2, (full.getHeight() - side) / 2, side, side);
                return Bitmap.createScaledBitmap(square, 512, 512, true);
            }
        } catch (Exception error) {
            return null;
        }
    }
}
