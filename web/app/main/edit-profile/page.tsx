"use client";

import {
  useState,
  useEffect,
  useContext,
} from "react";

import { useNavigation } from "@/utils/useNavigation";
import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";
import { UserContext } from "@/components/UserContext";
import { uploadProfileMedia } from "@/utils/r2";
import { normalizeWebsite } from "@/utils/normalizeWebsite";

export default function EditProfile() {
  const { push } = useNavigation();

  const userContext = useContext(UserContext);

  const user = userContext?.user;
  const setUser = userContext?.setUser;

  // -----------------------------
  // PROFILE STATES
  // -----------------------------

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [whatDoYouDo, setWhatDoYouDo] = useState("");
  const [gender, setGender] = useState("");

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [interests, setInterests] =
    useState<string[]>([]);

  // -----------------------------
  // MEDIA STATES
  // -----------------------------

  const [avatar, setAvatar] =
    useState<File | null>(null);

  const [cover, setCover] =
    useState<File | null>(null);

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [coverUrl, setCoverUrl] =
    useState("");

  const [avatarAssetId, setAvatarAssetId] =
    useState<string | null>(null);
  
  const [coverAssetId, setCoverAssetId] =
    useState<string | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  // -----------------------------
  // UPLOAD STATES
  // -----------------------------

  const [avatarUploading, setAvatarUploading] =
    useState(false);

  const [coverUploading, setCoverUploading] =
    useState(false);

  const [avatarProgress, setAvatarProgress] =
    useState(0);

  const [coverProgress, setCoverProgress] =
    useState(0);

  // -----------------------------
  // GENERAL STATES
  // -----------------------------

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // -----------------------------
  // FETCH PROFILE
  // -----------------------------

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile =
          await apiRequest("api/users/me/");

        setUsername(profile.username || "");
        setEmail(profile.email || "");
        setFullName(profile.full_name || "");
        setBio(profile.bio || "");
        setCountry(profile.country || "");
        setCity(profile.city || "");
        setWebsite(profile.website || "");
        setWhatDoYouDo(
          profile.what_do_you_do || ""
        );
        setGender(profile.gender || "");

        if (profile.date_of_birth) {
          const [y, m, d] =
            profile.date_of_birth.split("-");

          setYear(y);
          setMonth(m);
          setDay(d);
        }

        if (profile.avatar) {
            setAvatarUrl(profile.avatar);
            setPreview(profile.avatar);
        }
        
        if (profile.cover_photo) {
            setCoverUrl(profile.cover_photo);
            setCoverPreview(profile.cover_photo);
        }
        
        setAvatarAssetId(
            profile.avatar_asset_id || null
        );
        
        setCoverAssetId(
            profile.cover_asset_id || null
        );

        if (profile.interests) {
          setInterests(profile.interests);
        }
      } catch (err) {
        console.error(
          "Failed to load profile:",
          err
        );

        setError(
          "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // -----------------------------
  // AVATAR UPLOAD
  // -----------------------------

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
  
    if (!file) return;
  
    setError("");
  
    const localPreview = URL.createObjectURL(file);
  
    // Show the selected image immediately
    setAvatar(file);
    setPreview(localPreview);
  
    try {
      setAvatarUploading(true);
      setAvatarProgress(0);
  
      const completed = await uploadProfileMedia({
        file,
        mediaType: "avatar",
        onProgress: setAvatarProgress,
      });
  
      if (!completed?.original_url) {
        throw new Error(
          "Avatar upload did not return a URL."
        );
      }
  
      const uploadedUrl = completed.original_url;
  
      console.log(
        "AVATAR UPLOAD SUCCESS:",
        uploadedUrl
      );
  
      setAvatarUrl(uploadedUrl);
      setAvatarAssetId(completed.media_id);
      setAvatarProgress(100);
  
    } catch (err) {
      console.error(
        "Avatar upload failed:",
        err
      );
  
      URL.revokeObjectURL(localPreview);
  
      setAvatar(null);
      setAvatarUrl("");
  
      if (user?.avatar) {
        setPreview(user.avatar);
        setAvatarUrl(user.avatar);
      } else {
        setPreview(null);
      }
  
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload profile picture."
      );
  
    } finally {
      setAvatarUploading(false);
    }
  };

  // -----------------------------
  // COVER UPLOAD
  // -----------------------------

  const handleCoverChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
  
    if (!file) return;
  
    setError("");
  
    const localPreview = URL.createObjectURL(file);
  
    setCover(file);
    setCoverPreview(localPreview);
  
    try {
      setCoverUploading(true);
      setCoverProgress(0);
  
      const completed = await uploadProfileMedia({
        file,
        mediaType: "cover",
        onProgress: setCoverProgress,
      });
  
      if (!completed?.original_url) {
        throw new Error(
          "Cover upload did not return a URL."
        );
      }
  
      const uploadedUrl = completed.original_url;
  
      console.log(
        "COVER UPLOAD SUCCESS:",
        uploadedUrl
      );
  
      setCoverUrl(uploadedUrl);
      setCoverAssetId(completed.media_id);
      setCoverProgress(100);
  
    } catch (err) {
  
      console.error(
        "Cover upload failed:",
        err
      );
  
      URL.revokeObjectURL(localPreview);
      setCover(null);
      setCoverUrl("");
  
      if (user?.cover_photo) {
        setCoverPreview(user.cover_photo);
        setCoverUrl(user.cover_photo);
      } else {
        setCoverPreview(null);
      }
  
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload cover photo."
      );
  
    } finally {
      setCoverUploading(false);
    }
  };

  // -----------------------------
  // SAVE PROFILE
  // -----------------------------

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
  
    setError("");
  
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
  
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
  
    if (avatarUploading || coverUploading) {
      setError(
        "Please wait for image upload to finish."
      );
      return;
    }
  
    setSaving(true);
  
    try {
      const formData: any = {
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        bio,
        country,
        city,
        website: normalizeWebsite(website),
        what_do_you_do: whatDoYouDo.trim(),
        gender,
        interests,
      };
  
      if (year && month && day) {
        formData.date_of_birth =
          `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
  
      if (avatarUrl) {
        formData.avatar = avatarUrl;
      }
  
      if (coverUrl) {
        formData.cover_photo = coverUrl;
      }
  
      console.log(
        "FINAL PROFILE DATA BEING SENT TO DJANGO:",
        formData
      );
  
      const updatedUser =
        await apiRequest(
          "api/users/me/",
          {
            method: "PATCH",
            data: formData,
          }
        );
  
      console.log(
        "DJANGO PROFILE RESPONSE:",
        updatedUser
      );
  
      if (setUser) {
        setUser((prev: any) => ({
          ...prev,
          ...updatedUser,
  
          username:
            updatedUser?.username ??
            username,
  
          full_name:
            updatedUser?.full_name ??
            fullName,
  
          email:
            updatedUser?.email ??
            email,
  
          bio:
            updatedUser?.bio ??
            bio,
  
          country:
            updatedUser?.country ??
            country,
  
          city:
            updatedUser?.city ??
            city,
  
          website:
            updatedUser?.website ??
            normalizeWebsite(website),
  
          what_do_you_do:
            updatedUser?.what_do_you_do ??
            whatDoYouDo,
  
          gender:
            updatedUser?.gender ??
            gender,
  
          avatar:
            updatedUser?.avatar ??
            avatarUrl ??
            prev.avatar,
  
          cover_photo:
            updatedUser?.cover_photo ??
            coverUrl ??
            prev.cover_photo,
        }));
      }
  
      push(
        `/main/profile/${username}`
      );
  
    } catch (err: any) {
      console.error(
        "Profile save failed:",
        err
      );
  
      console.error(
        "Profile save response:",
        err?.response?.data
      );
  
      if (!navigator.onLine) {
        setError(
          "No internet connection."
        );
      } else if (
        err?.message === "Failed to fetch"
      ) {
        setError(
          "Network error. Please check your internet connection and try again."
        );
      } else {
        setError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong."
        );
      }
  
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // SUGGESTIONS
  // -----------------------------

  const suggestions = [
    "Student",
    "Software Engineer",
    "Content Creator",
    "Business Owner",
    "Entrepreneur",
    "Football Writer",
    "Teacher",
    "Nurse",
    "Photographer",
    "Artist",
  ];

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <div className="text-center mt-10">
        <Skeleton
          onComplete={() =>
            setLoading(false)
          }
        />
      </div>
    );
  }

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="flex justify-center items-center my-20 text-gray-800 dark:text-gray-200 rounded-2xl bg-gray-50 dark:bg-gray-950">

      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-6"
      >

        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Edit Your Profile
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* COVER */}

        <div>
          <label className="text-gray-700 dark:text-gray-300 font-medium">
            Cover Photo
          </label>

          <div
            className="relative h-40 mt-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-indigo-500 transition"
            onClick={() =>
              document
                .getElementById(
                  "coverInput"
                )
                ?.click()
            }
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                Click to upload
              </span>
            )}

            {coverUploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                <div className="text-sm font-semibold">
                  Uploading...
                </div>

                <div className="text-xs mt-1">
                  {coverProgress}%
                </div>
              </div>
            )}

            <input
              type="file"
              id="coverInput"
              hidden
              accept="image/*"
              onChange={handleCoverChange}
            />
          </div>

          {coverUploading && (
            <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{
                  width: `${coverProgress}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* AVATAR */}

        <div className="flex flex-col items-center">

          <label className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Profile Picture
          </label>

          <div
            className="relative w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-indigo-500 transition"
            onClick={() =>
              document
                .getElementById(
                  "avatarInput"
                )
                ?.click()
            }
          >

            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm text-center">
                Click to upload
              </span>
            )}

            {avatarUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {avatarProgress}%
              </div>
            )}

            <input
              type="file"
              id="avatarInput"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />

          </div>

          {avatarUploading && (
            <div className="w-32 mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{
                  width: `${avatarProgress}%`,
                }}
              />
            </div>
          )}

        </div>

        {/* USERNAME / NAME / EMAIL */}

        <div className="flex flex-col space-y-2">

          <input
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />

          <input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-100 dark:bg-gray-800"
          />

        </div>

        {/* DATE OF BIRTH */}

        <div className="flex flex-col">

          <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Date of Birth
          </label>

          <div className="grid grid-cols-3 gap-2">

            <select
              value={day}
              onChange={(e) =>
                setDay(e.target.value)
              }
              className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            >
              <option value="">
                Day
              </option>

              {Array.from(
                { length: 31 },
                (_, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                  >
                    {i + 1}
                  </option>
                )
              )}
            </select>

            <select
              value={month}
              onChange={(e) =>
                setMonth(e.target.value)
              }
              className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            >
              <option value="">
                Month
              </option>

              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m, i) => (
                <option
                  key={i}
                  value={i + 1}
                >
                  {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) =>
                setYear(e.target.value)
              }
              className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            >
              <option value="">
                Year
              </option>

              {Array.from(
                { length: 100 },
                (_, i) => {
                  const y =
                    new Date().getFullYear() -
                    i;

                  return (
                    <option
                      key={y}
                      value={y}
                    >
                      {y}
                    </option>
                  );
                }
              )}
            </select>

          </div>
        </div>

        {/* GENDER */}

        <select
          value={gender}
          onChange={(e) =>
            setGender(e.target.value)
          }
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
        >
          <option value="">
            Select Gender
          </option>

          <option value="male">
            Male
          </option>

          <option value="female">
            Female
          </option>

          <option value="other">
            Other
          </option>

          <option value="prefer_not">
            Prefer not to say
          </option>
        </select>

        {/* BIO */}

        <textarea
          placeholder="Bio"
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 resize-none"
          rows={4}
        />

        {/* COUNTRY / CITY */}

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="Country"
            value={country}
            onChange={(e) =>
              setCountry(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

          <input
            placeholder="City"
            value={city}
            onChange={(e) =>
              setCity(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

        </div>

        {/* WEBSITE */}

        <input
          placeholder="Website"
          value={website}
          onChange={(e) =>
            setWebsite(e.target.value)
          }
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
        />

        {/* WHAT DO YOU DO */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            What do you do?{" "}
            <span className="text-gray-500">
              (Optional)
            </span>
          </label>

          <input
            type="text"
            value={whatDoYouDo}
            onChange={(e) =>
              setWhatDoYouDo(
                e.target.value
              )
            }
            placeholder="e.g. Software Engineer, Student, Nurse..."
            maxLength={100}
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

          <p className="mt-2 text-xs text-gray-500">
            Examples:
          </p>

          <div className="mt-2 flex flex-wrap gap-2">

            {suggestions.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setWhatDoYouDo(
                      item
                    )
                  }
                  className="px-3 py-1 text-sm rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white transition"
                >
                  {item}
                </button>
              )
            )}

          </div>
        </div>

        {/* SAVE */}

        <button
          type="submit"
          disabled={
            saving ||
            avatarUploading ||
            coverUploading
          }
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {avatarUploading ||
          coverUploading
            ? "Uploading..."
            : saving
            ? "Saving..."
            : "Save Changes"}
        </button>

      </form>
    </div>
  );
}