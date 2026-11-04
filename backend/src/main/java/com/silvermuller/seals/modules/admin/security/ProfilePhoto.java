package com.silvermuller.seals.modules.admin.security;

import java.util.regex.Pattern;

/** Validation for profile pictures, which arrive from the browser already resized, as image data URLs. */
public final class ProfilePhoto {

    private ProfilePhoto() {}

    /** ~512 KB of base64; the browser resizes to 256px JPEG (~20-40 KB), so this only stops abuse. */
    static final int MAX_LENGTH = 700_000;
    private static final Pattern DATA_URL = Pattern.compile("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$");

    /** Returns the photo to store, null to clear it, or throws IllegalArgumentException (400) when invalid. */
    public static String validated(String photo) {
        if (photo == null || photo.isBlank()) return null;
        String p = photo.trim();
        if (p.length() > MAX_LENGTH) throw new IllegalArgumentException("Profile picture is too large.");
        if (!DATA_URL.matcher(p).matches()) {
            throw new IllegalArgumentException("Profile picture must be a PNG, JPEG or WebP image.");
        }
        return p;
    }
}
