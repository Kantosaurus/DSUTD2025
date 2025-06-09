"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { IconEye, IconEyeOff, IconAlertTriangle, IconCamera, IconUser, IconLock, IconTrash, IconLogout } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
} from "@/components/ui/resizable-navbar";
import { AvatarDropdown } from "@/components/ui/avatar-dropdown";

export default function AccountSettingsPage() {
  const { profile, signOut, updatePassword, deleteAccount, updateProfile, uploadAvatar } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    name: profile?.name || "",
  });

  const navItems = [
    { name: "Home", link: "/home" },
    { name: "My Events", link: "/events" },
    { name: "Settings", link: "/settings" },
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await uploadAvatar(file);
      if (error) throw error;
      setSuccess('Profile picture updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture');
    } finally {
      setIsLoading(false);
    }
  }, [uploadAvatar]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      const { error } = await updatePassword(formData.newPassword);
      if (error) throw error;
      
      setSuccess("Password updated successfully");
      // Clear form
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const { error } = await updateProfile({
        name: formData.name,
      });
      if (error) throw error;
      
      setSuccess("Profile updated successfully");
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await deleteAccount();
      if (error) throw error;
      
      await signOut();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Force a hard reload to clear all state
      window.location.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-2">
            <AvatarDropdown onLogout={handleLogout} />
          </div>
        </NavBody>
      </Navbar>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 ring-4 ring-white dark:ring-neutral-800 shadow-lg">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <IconCamera size={32} />
                      </div>
                    )}
                  </div>
                  <div
                    {...getRootProps()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                  >
                    <input {...getInputProps()} />
                    <IconCamera size={24} className="text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                  {profile?.name || "User"}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {profile?.email}
                </p>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <IconUser size={20} />
                  Profile
                </button>
                <button
                  onClick={() => document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <IconLock size={20} />
                  Security
                </button>
                <button
                  onClick={() => document.getElementById('danger')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <IconTrash size={20} />
                  Danger Zone
                </button>
                <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <IconLogout size={20} />
                    Logout
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Profile Section */}
            <section id="profile" className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-6">
                Profile Information
              </h3>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                {success && (
                  <div className="text-green-500 text-sm">{success}</div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                >
                  Update Profile
                </button>
              </form>
            </section>

            {/* Security Section */}
            <section id="security" className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-6">
                Security Settings
              </h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showCurrentPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showNewPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#800000] dark:focus:ring-[#ffb3b3] transition-all duration-200 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showConfirmPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                {success && (
                  <div className="text-green-500 text-sm">{success}</div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#800000] text-white dark:bg-[#ffb3b3] dark:text-[#800000] rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#800000]/20 dark:shadow-[#ffb3b3]/20"
                >
                  Update Password
                </button>
              </form>
            </section>

            {/* Danger Zone Section */}
            <section id="danger" className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-6">
                Danger Zone
              </h3>
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <IconAlertTriangle size={20} />
                      <p>Are you sure you want to delete your account?</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Yes, Delete My Account
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 