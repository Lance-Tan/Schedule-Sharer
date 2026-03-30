import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  private baseUrl = `${environment.apiUrl}/friends`;

  constructor(private http: HttpClient) { }

  requestFriend(userId: number, friendId: number) {
    return this.http.post(`${this.baseUrl}/request?userId=${userId}&friendId=${friendId}`, {});
  }
}
