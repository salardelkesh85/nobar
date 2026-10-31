import { type DynamicModule, Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller";
import { KEY_STORE, type KeyStore } from "./keys";
import { OtpService } from "./otp.service";
import { SessionsService } from "./sessions.service";
import { SMS_PROVIDER, type SmsProvider } from "./sms";
import { UsersService } from "./users.service";

/**
 * Identity & access: OTP sign-in, sessions, profile, addresses. Owns the `identity` schema.
 * Other modules use the exported UsersService or the user.* events, never the tables.
 */
@Module({})
export class IdentityModule {
  static forRoot(opts: { keys: KeyStore; sms: SmsProvider }): DynamicModule {
    return {
      module: IdentityModule,
      controllers: [IdentityController],
      providers: [
        { provide: KEY_STORE, useValue: opts.keys },
        { provide: SMS_PROVIDER, useValue: opts.sms },
        OtpService,
        SessionsService,
        UsersService,
      ],
      exports: [UsersService],
    };
  }
}
