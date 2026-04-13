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
    return this.http.post(`${this.baseUrl}/request?userId=${userId}&friendId=${friendId}`, {}, { responseType: 'text' });
  }

  listFriends(userId: number) {
    return this.http.get(`${this.baseUrl}/list?userId=${userId}`);
  }

  getIncomingRequests(userId: number) {
    return this.http.get(`${this.baseUrl}/requests/incoming?userId=${userId}`);
  }

  acceptRequest(requestId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/requests/${requestId}/accept?userId=${userId}`, {}, { responseType: 'text' });
  }

  denyRequest(requestId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/requests/${requestId}/deny?userId=${userId}`, {}, { responseType: 'text' });
  }
}
