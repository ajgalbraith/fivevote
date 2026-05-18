"use client";

import Link from "next/link";
import { Bell, Landmark, Menu, PlusCircle, User, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SiteMobileNavProps = {
  isSignedIn: boolean;
  userInitials?: string;
};

const publicLinks = [
  { href: "/bills", label: "Official bills", Icon: Landmark },
  { href: "/proposals", label: "Proposals", Icon: Users },
];

const signedInLinks = [
  { href: "/following", label: "Following", Icon: Bell },
  { href: "/proposals/new", label: "New proposal", Icon: PlusCircle },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function SiteMobileNav({ isSignedIn, userInitials = "U" }: SiteMobileNavProps) {
  const links = isSignedIn ? [...publicLinks, ...signedInLinks] : publicLinks;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="md:hidden"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="min-h-dvh w-80 max-w-[86vw] gap-0 overflow-y-auto bg-background p-0"
      >
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle>FiveVote</SheetTitle>
          <SheetDescription>Browse bills, proposals, and your saved activity.</SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-3" aria-label="Mobile navigation">
          {links.map(({ href, label, Icon }) => (
            <SheetClose
              key={href}
              nativeButton={false}
              render={
                <Link
                  href={href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-11 justify-start px-3 text-sm"
                  )}
                />
              }
            >
              <Icon />
              {label}
            </SheetClose>
          ))}
        </nav>

        <Separator />

        <div className="p-3">
          {isSignedIn ? (
            <SheetClose
              nativeButton={false}
              render={
                <Link
                  href="/profile"
                  className="flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-muted"
                />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">Account</span>
            </SheetClose>
          ) : (
            <SheetClose
              nativeButton={false}
              render={
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
                />
              }
            >
              Sign in
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
