import { Test } from '@nestjs/testing';
import { Controller, INestApplication, Post, UseGuards } from '@nestjs/common';
import * as supertest from 'supertest';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Controller('test/throttle')
class ThrottleTestController {
   @UseGuards(ThrottlerGuard)
   @Throttle({ default: { limit: 1, ttl: 1000 } })
   @Post()
   async testThrottle() {
      return {
         code: 'THROTTLE_TEST',
      };
   }
}

describe('Throttle Test', () => {
   let app: INestApplication;

   beforeAll(async () => {
      const module = await Test.createTestingModule({
         imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
         controllers: [ThrottleTestController],
      }).compile();

      app = module.createNestApplication();
      await app.init();
   });

   test('throttler blocking', async () => {
      const st = supertest(app.getHttpServer());
      await st.post('/test/throttle').expect(201);

      // Confirm that we can request again after 1000ms
      await new Promise((r) => setTimeout(r, 1000));
      await st.post('/test/throttle').expect(201);

      // next request should be blocked
      await st.post('/test/throttle').expect(429);

      // additional requests at the same time should be blocked
      await st.post('/test/throttle').expect(429);
   });

   afterAll(async () => {
      await app.close();
   });
});
