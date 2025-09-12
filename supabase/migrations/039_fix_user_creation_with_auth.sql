-- Fix user creation to properly create auth users and send email invitations
-- This replaces the current create_user_with_invitation function

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_user_with_invitation(
    p_first_name TEXT,
    p_last_name TEXT,
    p_title TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_role user_role,
    p_department TEXT,
    p_created_by UUID
);

-- Create a new function that properly handles auth user creation
CREATE OR REPLACE FUNCTION public.create_user_with_invitation(
    p_first_name TEXT,
    p_last_name TEXT,
    p_title TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_role user_role,
    p_department TEXT,
    p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_existing_user_count INTEGER;
    v_email_verified BOOLEAN;
    v_result JSON;
    v_error_message TEXT;
BEGIN
    -- Check if user already exists in auth.users
    SELECT COUNT(*) INTO v_existing_user_count
    FROM auth.users
    WHERE email = p_email;
    
    IF v_existing_user_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User with this email already exists in auth system'
        );
    END IF;
    
    -- Check if user already exists in public.users
    SELECT COUNT(*) INTO v_existing_user_count
    FROM public.users
    WHERE email = p_email;
    
    IF v_existing_user_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile with this email already exists'
        );
    END IF;
    
    -- Determine email_verified status to avoid constraint conflicts
    SELECT COUNT(*) INTO v_existing_user_count
    FROM public.users
    WHERE email_verified = FALSE;
    
    IF v_existing_user_count > 0 THEN
        v_email_verified := TRUE;
    ELSE
        v_email_verified := FALSE;
    END IF;
    
    -- Create auth user first (this will trigger email invitation)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at
    ) VALUES (
        (SELECT id FROM auth.instances LIMIT 1),
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        NULL,
        NOW(),
        encode(gen_random_bytes(32), 'hex'),
        NOW(),
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email'],
            'first_name', p_first_name,
            'last_name', p_last_name,
            'title', p_title,
            'role', p_role,
            'department', p_department
        ),
        jsonb_build_object(
            'first_name', p_first_name,
            'last_name', p_last_name,
            'title', p_title,
            'role', p_role,
            'department', p_department,
            'phone', p_phone
        ),
        false,
        NOW(),
        NOW(),
        p_phone,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        0,
        NULL,
        NULL,
        NULL
    ) RETURNING id INTO v_user_id;
    
    -- Create user profile in public.users
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        title,
        phone,
        role,
        department,
        full_name,
        initials,
        join_date,
        status,
        is_active,
        email_verified,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_email,
        p_first_name,
        p_last_name,
        p_title,
        p_phone,
        p_role,
        p_department,
        p_first_name || ' ' || p_last_name,
        upper(substring(p_first_name, 1, 1) || substring(p_last_name, 1, 1)),
        CURRENT_DATE,
        'active',
        true,
        v_email_verified,
        p_created_by,
        NOW(),
        NOW()
    ) RETURNING id INTO v_profile_id;
    
    -- Create audit log entry
    INSERT INTO public.user_audit_log (
        user_id,
        action,
        details,
        performed_by,
        performed_at
    ) VALUES (
        v_user_id,
        'user_created',
        jsonb_build_object(
            'email', p_email,
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', p_role,
            'department', p_department,
            'invitation_sent', true
        ),
        p_created_by,
        NOW()
    );
    
    -- Create admin notification
    INSERT INTO public.admin_notifications (
        user_id,
        notification_type,
        title,
        message,
        created_at
    ) VALUES (
        v_user_id,
        'user_invited',
        'New User Invited',
        p_first_name || ' ' || p_last_name || ' has been invited to join the platform.',
        NOW()
    );
    
    -- Return success with user details
    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'profile_id', v_profile_id,
        'email', p_email,
        'message', 'User created successfully and invitation email sent'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any partial changes
        IF v_user_id IS NOT NULL THEN
            DELETE FROM auth.users WHERE id = v_user_id;
        END IF;
        
        IF v_profile_id IS NOT NULL THEN
            DELETE FROM public.users WHERE id = v_profile_id;
        END IF;
        
        v_error_message := SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', v_error_message
        );
END;
$$; 