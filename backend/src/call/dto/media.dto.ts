import { IsIn, IsObject, IsUUID } from 'class-validator';
import type { types } from 'mediasoup';

export class CreateTransportDto {
  @IsIn(['send', 'recv'])
  direction!: 'send' | 'recv';
}

export class ConnectTransportDto {
  @IsUUID()
  transportId!: string;

  @IsObject() //checks for is an object or not? whitelist and forbitwhitelist checks the top level of an object and the nested ones leaves unchecked
  dtlsParameters!: types.DtlsParameters;
}

export class ProduceDto {
  @IsUUID()
  transportId!: string;

  @IsIn(['audio', 'video'])
  kind!: types.MediaKind;

  @IsObject()
  rtpParameters!: types.RtpParameters;
}

export class ConsumeDto {
  @IsUUID()
  transportId!: string;

  @IsUUID()
  producerId!: string;

  @IsObject()
  rtpCapabilities!: types.RtpCapabilities;
}

export class ResumeConsumerDto {
  @IsUUID()
  consumerId!: string;
}
