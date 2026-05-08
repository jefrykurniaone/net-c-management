import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarDays, CreditCard, Users, ShieldCheck } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    if (!session.user.isProfileComplete) {
      redirect("/onboarding");
    }
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">PB</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            PB Net-C
          </span>
        </div>
        <Link href="/auth/signin">
          <Button variant="outline">Masuk</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="text-center py-20 px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>🏸</span>
          <span>Komunitas Badminton PB Net-C</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
          Kelola Komunitas Badminton{" "}
          <span className="text-green-600">Lebih Mudah</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Atur jadwal sesi latihan, kelola iuran anggota, dan pantau kehadiran —
          semua dalam satu platform khusus untuk komunitas PB Net-C.
        </p>
        <Link href="/auth/signin">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
            Masuk dengan Google
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">
          Fitur Utama
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: CalendarDays,
              title: "Jadwal Sesi",
              desc: "Lihat dan daftar sesi latihan yang akan datang dengan mudah.",
              color: "bg-blue-50 text-blue-600",
            },
            {
              icon: CreditCard,
              title: "Iuran Bulanan",
              desc: "Upload bukti bayar dan pantau status pembayaran iuran kamu.",
              color: "bg-green-50 text-green-600",
            },
            {
              icon: Users,
              title: "Manajemen Anggota",
              desc: "Admin dapat mengelola data dan status anggota komunitas.",
              color: "bg-orange-50 text-orange-600",
            },
            {
              icon: ShieldCheck,
              title: "Panel Admin",
              desc: "Dashboard khusus admin untuk konfirmasi pembayaran & laporan.",
              color: "bg-purple-50 text-purple-600",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 dark:border-gray-800">
        © {new Date().getFullYear()} PB Net-C. Semua hak dilindungi.
      </footer>
    </div>
  );
}
