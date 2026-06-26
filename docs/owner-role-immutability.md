# Plan: OWNER Role Immutability in Manage Members

## Context
Role `OWNER` telah ditambahkan ke enum `Role` di `prisma/schema.prisma`. Requirement: user dengan role `OWNER` tidak bisa diubah role maupun status aktif-nya oleh siapapun (termasuk sesama OWNER) melalui menu Manage Members. Perlindungan harus ada di dua layer: UI (tombol tidak muncul/disable) dan API (server menolak request).

---

## Files to Modify

### 1. `src/app/api/users/route.ts` — Server-side guard (critical)

Tambahkan lookup ke DB sebelum update. Jika target user adalah OWNER, tolak dengan 403.

**Di `PATCH` handler, setelah cek `body.id`, sebelum `prisma.user.update`:**
```ts
const target = await prisma.user.findUnique({
    where: { id: body.id },
    select: { role: true },
});
if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot modify an OWNER account' }, { status: 403 });
}
```

### 2. `src/app/(admin)/admin/members/member-actions.tsx` — UI guard

- Update interface `Member`: `role: "ADMIN" | "MEMBER" | "OWNER"`
- Tambah `const isOwner = member.role === "OWNER"`
- Tombol Activate/Deactivate: tambah `isOwner` ke `disabled={loading || isSelf || isOwner}`
- Tombol Make Admin/Member: ubah kondisi render dari `!isSelf` menjadi `!isSelf && !isOwner`

### 3. `src/lib/i18n/dictionaries.ts` — Tambah OWNER ke roles dictionary

Di objek `en.roles` dan `id.roles`, tambahkan:
```ts
OWNER: "Owner"
```

Ini juga menyelesaikan TypeScript error karena `t.roles[u.role]` di `page.tsx` akan punya key yang valid untuk semua nilai `Role`.

### 4. `src/app/(admin)/admin/members/page.tsx` — Badge styling untuk OWNER

Baris 138–143, update Badge agar OWNER punya visual yang berbeda (ungu):
```tsx
<Badge
  variant={u.role === "ADMIN" ? "default" : "secondary"}
  className={`text-xs${u.role === "OWNER" ? " bg-purple-600 text-white hover:bg-purple-700 border-transparent" : ""}`}
>
  {t.roles[u.role]}
</Badge>
```

---

## Verification

1. Jalankan `npx prisma generate` agar Prisma Client mengenali enum `OWNER`.
2. Jalankan `npm run dev` dan login sebagai ADMIN.
3. Di Manage Members, buka row user yang punya role `OWNER`:
   - Badge role tampil "Owner" dengan warna ungu
   - Tombol Activate/Deactivate ter-disable
   - Tombol Make Admin/Make Member tidak muncul
4. Test via DevTools ke `PATCH /api/users` dengan body `{ "id": "<owner-id>", "isActive": false }` — harus mendapat response 403.
