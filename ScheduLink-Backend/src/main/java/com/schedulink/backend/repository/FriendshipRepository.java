package com.schedulink.backend.repository;

import com.schedulink.backend.model.Friendship;
import com.schedulink.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // Find a friendship between two users
    @Query("SELECT f FROM Friendship f WHERE (f.user = :a AND f.friend = :b) OR (f.user = :b AND f.friend = :a)")
    Optional<Friendship> findBetweenUsers(@Param("a") User a, @Param("b") User b);

    @Query("SELECT f FROM Friendship f WHERE (f.user.id = :userId OR f.friend.id = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findAcceptedForUser(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f WHERE f.friend.id = :userId AND f.status = 'PENDING'")
    List<Friendship> findIncomingPendingForUser(@Param("userId") Long userId);

    Optional<Friendship> findByIdAndFriend_Id(Long id, Long friendId);
}
