export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <span className="text-red-600 dark:text-red-400 text-xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Gagal Masuk
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Terjadi kesalahan saat proses login. Silakan coba lagi.
        </p>
        <a
          href="/auth/signin"
          className="text-sm text-green-600 hover:underline font-medium"
        >
          Kembali ke halaman login
        </a>
      </div>
    </div>
  );
}
