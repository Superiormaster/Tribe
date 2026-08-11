"use client";

import { useEffect, useContext, useState } from "react";
import { countries } from "countries-list";

import { useNavigation } from "@/utils/useNavigation";
import { useOnboardingGuard } from "@/utils/useOnboardingGuard";
import { normalizeWebsite } from "@/utils/normalizeWebsite";
import { apiRequest } from "@/utils/api";
import { uploadProfileMedia } from "@/utils/r2";
import { UserContext } from "@/components/UserContext";

export default function ProfileSetup() {
  const { back, push } = useNavigation();
  const { user, setUser } = useContext(UserContext)!;

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [whatDoYouDo, setWhatDoYouDo] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarAssetId, setAvatarAssetId] =
    useState<string | null>(null);
  const [coverAssetId, setCoverAssetId] =
    useState<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] =
    useState(false);

  const [coverUploading, setCoverUploading] =
    useState(false);

  const [avatarProgress, setAvatarProgress] =
    useState(0);

  const [coverProgress, setCoverProgress] =
    useState(0);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] =
    useState(true);

  const [error, setError] = useState("");

  useOnboardingGuard("profile");

  const countryList = Object.entries(countries)
    .map(([code, country]) => ({
      code,
      name: country.name,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);

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
          setMonth(String(Number(m)));
          setDay(String(Number(d)));
        }

        if (profile.avatar) {
          setAvatarUrl(profile.avatar);
          setPreview(profile.avatar);
        }

        if (profile.cover_photo) {
          setCoverUrl(profile.cover_photo);
          setCoverPreview(
            profile.cover_photo
          );
        }
      } catch (err) {
        console.error(
          "Failed to load profile:",
          err
        );

        setError(
          "Failed to load your profile."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      if (
        coverPreview?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [preview, coverPreview]);

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
  
    if (!file) return;
  
    setError("");
  
    const localPreview = URL.createObjectURL(file);
  
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
          "Avatar upload completed but no URL was returned."
        );
      }
  
      const uploadedUrl = completed.original_url;
  
      setAvatarUrl(uploadedUrl);
      setAvatarAssetId(completed.media_id);
  
      setPreview(uploadedUrl);
  
      setAvatarProgress(100);
  
      // The blob is no longer needed.
      URL.revokeObjectURL(localPreview);
  
    } catch (err) {
      console.error(
        "Avatar upload failed:",
        err
      );
  
      URL.revokeObjectURL(localPreview);
  
      setAvatar(null);
      setAvatarUrl("");
      setAvatarAssetId(null);
      setAvatarProgress(0);
  
      setPreview(null);
  
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload profile picture."
      );
    } finally {
      setAvatarUploading(false);
    }
  
    // Allow selecting the same file again.
    e.target.value = "";
  };

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
          "Cover upload completed but no URL was returned."
        );
      }
  
      const uploadedUrl = completed.original_url;
  
      setCoverUrl(uploadedUrl);
      setCoverAssetId(completed.media_id);
  
      setCoverPreview(uploadedUrl);
  
      setCoverProgress(100);
  
      URL.revokeObjectURL(localPreview);
  
    } catch (err) {
      console.error(
        "Cover upload failed:",
        err
      );
  
      URL.revokeObjectURL(localPreview);
  
      setCover(null);
      setCoverUrl("");
      setCoverAssetId(null);
      setCoverProgress(0);
  
      setCoverPreview(null);
  
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload cover photo."
      );
    } finally {
      setCoverUploading(false);
    }
  
    // Allow selecting the same file again.
    e.target.value = "";
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!fullName.trim()) {
      setError(
        "Full Name is required."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Email is required."
      );
      return;
    }

    if (!username.trim()) {
      setError(
        "Username is required."
      );
      return;
    }

    if (!country.trim()) {
      setError(
        "Country is required."
      );
      return;
    }

    if (!gender.trim()) {
      setError(
        "Gender is required."
      );
      return;
    }

    if (
      avatarUploading ||
      coverUploading
    ) {
      setError(
        "Please wait for your image uploads to finish."
      );
      return;
    }

    setLoading(true);

    try {
      const dob =
        year && month && day
          ? `${year}-${String(month).padStart(
              2,
              "0"
            )}-${String(day).padStart(
              2,
              "0"
            )}`
          : null;

      const formData: Record<
        string,
        any
      > = {
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        country: country.trim(),
        city: city.trim(),
        gender: gender.trim(),
        what_do_you_do:
          whatDoYouDo.trim(),
      };

      if (bio.trim()) {
        formData.bio = bio.trim();
      }

      if (website.trim()) {
        formData.website =
          normalizeWebsite(
            website.trim()
          );
      }

      if (dob) {
        formData.date_of_birth = dob;
      }

      console.log(
        "Submitting profile:",
        formData
      );

      await apiRequest(
        "api/users/me/",
        {
          method: "PATCH",
          data: formData,
        }
      );
  
      const updatedUser = await apiRequest(
        "api/users/me/"
      );
  
      console.log("UPDATED USER:", updatedUser);
      setUser(updatedUser);

      push("/auth/discover");

    } catch (err: any) {
      console.error(
        "Profile setup failed:",
        err
      );

      console.error(
        "Response:",
        err?.response?.data
      );

      if (!navigator.onLine) {
        setError(
          "No internet connection."
        );
      } else if (
        err?.message ===
        "Failed to fetch"
      ) {
        setError(
          "Network error. Please check your internet connection and try again."
        );
      } else {
        const responseData =
          err?.response?.data;

        if (
          typeof responseData ===
          "string"
        ) {
          setError(responseData);
        } else if (
          responseData?.detail
        ) {
          setError(
            responseData.detail
          );
        } else if (
          responseData?.message
        ) {
          setError(
            responseData.message
          );
        } else {
          setError(
            err?.message ||
              "Something went wrong while completing your profile."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

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

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500">
          Loading profile...
        </div>
      </div>
    );
  }

  const isBusy =
    loading ||
    avatarUploading ||
    coverUploading;

  const canSubmit =
    !isBusy &&
    fullName.trim() &&
    email.trim() &&
    username.trim() &&
    country.trim() &&
    gender.trim();

  return (
    <div className="flex justify-center items-center text-gray-700 dark:text-gray-200 rounded-2xl bg-gray-50 dark:bg-gray-950">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 py-3 px-5 rounded-2xl shadow-xl w-full max-w-md space-y-6"
      >

        {/* BACK */}

        <button
          type="button"
          onClick={back}
          className="p-1 border border-indigo-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          ←
        </button>

        {/* TITLE */}

        <div className="flex items-center gap-2 mb-4">

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center w-full">
            Complete Your Profile
          </h1>

        </div>

        {/* ERROR */}

        {error && (
          <div className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-2 rounded-lg text-sm text-center break-words">
            {error}
          </div>
        )}

        {/* -------------------------------- */}
        {/* COVER */}
        {/* -------------------------------- */}

        <div>

          <label className="text-gray-700 dark:text-gray-300 font-medium">
            Cover Photo
          </label>

          <div
            className="relative mt-2 h-40 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 cursor-pointer"
            onClick={() =>
              document
                .getElementById("cover")
                ?.click()
            }
          >

            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">
                  Click to upload
                </span>
              </div>
            )}

            {coverUploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                <span className="text-sm font-semibold">
                  Uploading...
                </span>

                <span className="text-xs mt-1">
                  {coverProgress}%
                </span>
              </div>
            )}

          </div>

          {/* COVER PROGRESS */}

          {coverUploading && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-indigo-600 transition-all duration-200"
                style={{
                  width: `${coverProgress}%`,
                }}
              />
            </div>
          )}

          <input
            id="cover"
            hidden
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
          />

        </div>

        {/* -------------------------------- */}
        {/* AVATAR */}
        {/* -------------------------------- */}

        <div className="flex flex-col items-center">

          <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Picture
          </label>

          <div className="relative w-32 h-32">

            {/* SPINNER */}

            {avatarUploading && (
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin z-10 pointer-events-none" />
            )}

            <div
              className="w-32 h-32 rounded-full overflow-hidden border-2 border-dashed cursor-pointer bg-gray-100 dark:bg-gray-800"
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
                <div className="w-full h-full flex items-center justify-center text-center text-sm text-gray-400">
                  Click to upload
                </div>
              )}

            </div>

            <input
              id="avatarInput"
              hidden
              type="file"
              accept="image/*"
              onChange={
                handleAvatarChange
              }
            />

          </div>

          {/* AVATAR PROGRESS */}

          {avatarUploading && (
            <div className="w-32 mt-2">

              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

                <div
                  className="h-full bg-indigo-600 transition-all duration-200"
                  style={{
                    width: `${avatarProgress}%`,
                  }}
                />

              </div>

              <p className="text-xs text-gray-500 text-center mt-1">
                {avatarProgress}%
              </p>

            </div>
          )}

        </div>

        {/* -------------------------------- */}
        {/* USERNAME */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            Username{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            required
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

        </div>

        {/* -------------------------------- */}
        {/* FULL NAME */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            Full name{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e) =>
              setFullName(
                e.target.value
              )
            }
            required
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

        </div>

        {/* -------------------------------- */}
        {/* EMAIL */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            Email{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

        </div>

        {/* -------------------------------- */}
        {/* DATE OF BIRTH */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-2 text-sm font-medium">
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
                setMonth(
                  e.target.value
                )
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
                setYear(
                  e.target.value
                )
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

        {/* -------------------------------- */}
        {/* GENDER */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            Gender{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            value={gender}
            onChange={(e) =>
              setGender(
                e.target.value
              )
            }
            required
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

        </div>

        {/* -------------------------------- */}
        {/* BIO */}
        {/* -------------------------------- */}

        <div className="flex flex-col">

          <label className="mb-1 text-sm font-medium">
            Bio{" "}
            <span className="text-gray-500">
              (Optional)
            </span>
          </label>

          <textarea
            placeholder="Tell us something about yourself..."
            value={bio}
            onChange={(e) =>
              setBio(e.target.value)
            }
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 resize-none"
            rows={4}
          />

        </div>

        {/* -------------------------------- */}
        {/* COUNTRY / CITY */}
        {/* -------------------------------- */}

        <div>

          <label className="mb-1 text-sm font-medium">
            Country{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">

            <select
              value={country}
              onChange={(e) =>
                setCountry(
                  e.target.value
                )
              }
              required
              className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            >

              <option value="">
                Select Country
              </option>

              {countryList.map(
                (c) => (
                  <option
                    key={c.code}
                    value={c.name}
                  >
                    {c.name}
                  </option>
                )
              )}

            </select>

            <input
              placeholder="City"
              value={city}
              onChange={(e) =>
                setCity(
                  e.target.value
                )
              }
              className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            />

          </div>

        </div>

        {/* -------------------------------- */}
        {/* WEBSITE */}
        {/* -------------------------------- */}

        <input
          placeholder="Website"
          value={website}
          onChange={(e) =>
            setWebsite(
              e.target.value
            )
          }
          className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
        />

        {/* -------------------------------- */}
        {/* WHAT DO YOU DO */}
        {/* -------------------------------- */}

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
            placeholder="e.g. Software Engineer, Student, Nurse, Football Writer..."
            maxLength={100}
            className="w-full px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          />

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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

        {/* -------------------------------- */}
        {/* SUBMIT */}
        {/* -------------------------------- */}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            canSubmit
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-gray-400 cursor-not-allowed text-white"
          }`}
        >

          {avatarUploading ||
          coverUploading
            ? "Uploading..."
            : loading
            ? "Saving..."
            : "Complete Profile"}

        </button>

      </form>
    </div>
  );
}